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
Route::get('/app-version', function () {
    return response()->json(['version' => config('nativephp.version')]);
});
Route::post('/check-for-updates', function () {
    try {
        \Native\Laravel\Facades\AutoUpdater::checkForUpdates();
        return response()->json(['status' => 'checking']);
    } catch (\Throwable $e) {
        return response()->json(['error' => $e->getMessage()], 500);
    }
});
