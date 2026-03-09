<?php

use App\Http\Controllers\Api\LedgerController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\StockController;
use App\Http\Controllers\Api\SyncController;
use App\Http\Controllers\Api\TransactionLogController;
use App\Http\Controllers\Api\TreasuryController;
use Illuminate\Support\Facades\Route;

// Settings
Route::post('/locale/{locale}', [SettingsController::class, 'switchLocale']);
Route::post('/factory', [SettingsController::class, 'switchFactory']);
Route::get('/translations', [SettingsController::class, 'translations']);

// Stock
Route::prefix('stock')->group(function () {
    Route::get('/', [StockController::class, 'index']);
    Route::get('/generate-id', [StockController::class, 'generateId']);
    Route::post('/check-id', [StockController::class, 'checkId']);
    Route::post('/store', [StockController::class, 'store']);
    Route::post('/update-stock', [StockController::class, 'updateStock']);
    Route::post('/edit', [StockController::class, 'edit']);
    Route::post('/delete', [StockController::class, 'destroy']);
    Route::get('/low-stock', [StockController::class, 'lowStock']);
    Route::get('/suppliers', [StockController::class, 'suppliers']);
    Route::get('/export', [StockController::class, 'export']);
    Route::post('/reverse', [StockController::class, 'reverseTransaction']);
});

// Ledger (customers, suppliers, covenants, advances)
Route::prefix('ledger/{type}')->group(function () {
    Route::get('/', [LedgerController::class, 'index']);
    Route::get('/generate-code', [LedgerController::class, 'generateCode']);
    Route::post('/check-code', [LedgerController::class, 'checkCode']);
    Route::post('/store', [LedgerController::class, 'store']);
    Route::post('/update', [LedgerController::class, 'update']);
    Route::post('/delete', [LedgerController::class, 'destroy']);
    Route::get('/transactions', [LedgerController::class, 'transactions']);
});
Route::post('/ledger/reverse', [LedgerController::class, 'reverseTransaction']);

// Treasury
Route::prefix('treasury')->group(function () {
    Route::get('/summary', [TreasuryController::class, 'summary']);
    Route::post('/initialize', [TreasuryController::class, 'initialize']);
    Route::post('/reset', [TreasuryController::class, 'reset']);
});

// Transaction logs
Route::get('/transactions/stock', [TransactionLogController::class, 'stock']);
Route::get('/transactions/ledger', [TransactionLogController::class, 'ledger']);

// Firebase sync
Route::prefix('sync')->group(function () {
    Route::post('/pull', [SyncController::class, 'pull']);
    Route::post('/push', [SyncController::class, 'push']);
    Route::post('/force-pull', [SyncController::class, 'forcePull']);
});

// App info & updates
Route::post('/check-for-updates', function () {
    $currentVersion = config('nativephp.version');
    $owner = config('nativephp.updater.providers.github.owner');
    $repo = config('nativephp.updater.providers.github.repo');

    try {
        $response = \Illuminate\Support\Facades\Http::withHeaders([
            'Accept' => 'application/vnd.github+json',
        ])->get("https://api.github.com/repos/{$owner}/{$repo}/releases/latest");

        if ($response->failed()) {
            return response()->json([
                'current' => $currentVersion,
                'error' => 'Could not reach GitHub',
            ], 502);
        }

        $latestTag = $response->json('tag_name');
        $latestVersion = ltrim($latestTag, 'v');
        $hasUpdate = version_compare($latestVersion, $currentVersion, '>');

        // Find the setup.exe download URL from release assets
        $downloadUrl = null;
        if ($hasUpdate) {
            $assets = $response->json('assets') ?? [];
            foreach ($assets as $asset) {
                if (str_ends_with($asset['name'] ?? '', '-setup.exe')) {
                    $downloadUrl = $asset['browser_download_url'];
                    break;
                }
            }

            // Trigger electron-updater in background (best effort)
            try {
                \Native\Laravel\Facades\AutoUpdater::checkForUpdates();
            } catch (\Throwable $e) {
                // Updater not available in dev mode
            }
        }

        return response()->json([
            'current' => $currentVersion,
            'latest' => $latestVersion,
            'has_update' => $hasUpdate,
            'download_url' => $downloadUrl,
        ]);
    } catch (\Throwable $e) {
        return response()->json([
            'current' => $currentVersion,
            'error' => $e->getMessage(),
        ], 500);
    }
});

Route::post('/open-url', function (\Illuminate\Http\Request $request) {
    $url = $request->input('url');
    if (!$url || !str_starts_with($url, 'https://github.com/')) {
        return response()->json(['error' => 'Invalid URL'], 400);
    }
    try {
        \Native\Laravel\Facades\Shell::openExternal($url);
        return response()->json(['ok' => true]);
    } catch (\Throwable $e) {
        return response()->json(['error' => $e->getMessage()], 500);
    }
});

Route::get('/update-status', function () {
    return response()->json(
        \Illuminate\Support\Facades\Cache::get('update_status', ['status' => 'idle'])
    );
});

Route::post('/update-install', function () {
    try {
        \Native\Laravel\Facades\AutoUpdater::quitAndInstall();
        return response()->json(['ok' => true]);
    } catch (\Throwable $e) {
        return response()->json(['error' => $e->getMessage()], 500);
    }
});
