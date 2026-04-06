<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\FirebaseSyncService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SyncController extends Controller
{
    public function pull(): JsonResponse
    {
        set_time_limit(900);
        try {
            $service = app(FirebaseSyncService::class);
            $result = $service->pullAll(true);
            return response()->json([
                'success' => true,
                'result' => $result,
                'warnings' => $result['errors'] ?? [],
            ]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function push(): JsonResponse
    {
        set_time_limit(900);
        try {
            $service = app(FirebaseSyncService::class);
            // Bulk push replaces individual doc push — much fewer Firestore writes
            $result = $service->bulkPush();
            return response()->json([
                'success' => true,
                'result' => $result,
                'warnings' => $result['errors'] ?? [],
            ]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function forcePull(): JsonResponse
    {
        set_time_limit(900);
        try {
            $service = app(FirebaseSyncService::class);
            // Bulk pull (~30 reads vs ~20k)
            // Falls back to legacy if bulk data doesn't exist yet
            $result = $service->bulkPull();
            if ($result['pulled'] === 0) {
                $result = $service->forcePull();
                // Create bulk snapshot for next time
                $service->bulkPush();
            }
            return response()->json([
                'success' => true,
                'result' => $result,
                'warnings' => $result['errors'] ?? [],
            ]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Debug test: push/pull mock data to _debug/ collection on Firebase.
     * Only useful in dev mode for verifying sync connectivity.
     */
    public function debugTest(Request $request): JsonResponse
    {
        set_time_limit(120);
        $action = $request->input('action'); // 'write', 'read', 'bulk_push', 'bulk_pull', 'legacy_push', 'legacy_pull'
        try {
            $service = app(FirebaseSyncService::class);
            $ref = new \ReflectionClass($service);

            $setDoc = $ref->getMethod('setDocument');
            $setDoc->setAccessible(true);
            $getDoc = $ref->getMethod('getDocument');
            $getDoc->setAccessible(true);

            $results = ['action' => $action, 'success' => true];

            match ($action) {
                'write' => (function () use ($service, $setDoc, $getDoc, &$results) {
                    $data = [
                        'test_string' => 'hello_' . now()->timestamp,
                        'test_number' => rand(1, 9999),
                        'test_time' => now()->format('Y-m-d H:i:s'),
                        'records' => [
                            ['id' => 1, 'name' => 'mock_a', 'amount' => 100],
                            ['id' => 2, 'name' => 'mock_b', 'amount' => 200],
                            ['id' => 3, 'name' => 'mock_c', 'amount' => 300],
                        ],
                    ];
                    $setDoc->invoke($service, '_debug/sync_test', $data);
                    $results['wrote'] = $data;
                })(),

                'read' => (function () use ($service, $getDoc, &$results) {
                    $data = $getDoc->invoke($service, '_debug/sync_test');
                    $results['read'] = $data;
                    $results['has_records'] = is_array($data['records'] ?? null);
                    $results['record_count'] = count($data['records'] ?? []);
                })(),

                'bulk_push' => (function () use ($service, &$results) {
                    $result = $service->bulkPush();
                    $results['pushed'] = $result['pushed'];
                    $results['errors'] = $result['errors'];
                })(),

                'bulk_pull' => (function () use ($service, &$results) {
                    $result = $service->bulkPull();
                    $results['pulled'] = $result['pulled'];
                    $results['skipped'] = $result['skipped'];
                    $results['errors'] = $result['errors'];
                })(),

                'legacy_push' => (function () use ($service, &$results) {
                    $result = $service->pushAll();
                    $results['pushed'] = $result['pushed'];
                    $results['errors'] = $result['errors'];
                })(),

                'legacy_pull' => (function () use ($service, &$results) {
                    $result = $service->forcePull();
                    $results['pulled'] = $result['pulled'];
                    $results['errors'] = $result['errors'];
                })(),

                default => $results = ['success' => false, 'message' => 'Unknown action. Use: write, read, bulk_push, bulk_pull, legacy_push, legacy_pull'],
            };

            return response()->json($results);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'action' => $action, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Insert mock data into local DB for testing sync.
     */
    public function debugInsert(Request $request): JsonResponse
    {
        $type = $request->input('type');
        $count = min((int) ($request->input('count', 1)), 50);
        $created = 0;

        try {
            for ($i = 0; $i < $count; $i++) {
                $ts = now()->subSeconds($count - $i);
                $suffix = strtoupper(substr(md5(uniqid()), 0, 4));

                match ($type) {
                    'customer' => \App\Models\Customer::create([
                        'customer_code' => "DBG-CUST-{$suffix}",
                        'name' => "Debug Customer {$suffix}",
                        'phone' => '0100000' . rand(1000, 9999),
                        'opening_balance' => 0,
                        'debit' => rand(100, 5000),
                        'credit' => rand(0, 2000),
                        'balance' => 0,
                    ]),
                    'supplier' => \App\Models\Supplier::create([
                        'supplier_code' => "DBG-SUPP-{$suffix}",
                        'name' => "Debug Supplier {$suffix}",
                        'phone' => '0100000' . rand(1000, 9999),
                        'opening_balance' => 0,
                        'debit' => 0,
                        'credit' => rand(100, 5000),
                        'balance' => 0,
                    ]),
                    'treasury' => \App\Models\TreasuryAccount::create([
                        'account_number' => "DBG-{$suffix}",
                        'account_name' => "Debug Account {$suffix}",
                        'opening_balance' => rand(1000, 50000),
                        'debit' => 0,
                        'credit' => 0,
                        'balance' => 0,
                    ]),
                    'ledger_log' => \App\Models\LedgerLog::create([
                        'logged_at' => $ts,
                        'transaction_date' => $ts->toDateString(),
                        'ledger_type' => 'customer',
                        'entity_code' => 'DBG-CUST-0001',
                        'entity_name' => 'Debug Entity',
                        'transaction_type' => 'update',
                        'debit' => rand(100, 5000),
                        'credit' => 0,
                        'previous_balance' => 0,
                        'new_balance' => rand(100, 5000),
                        'statement' => "Debug log {$suffix}",
                    ]),
                    'ledger_transaction' => \App\Models\LedgerTransaction::create([
                        'logged_at' => $ts,
                        'transaction_date' => $ts->toDateString(),
                        'ledger_type' => 'customer',
                        'entity_code' => 'DBG-CUST-0001',
                        'entity_name' => 'Debug Entity',
                        'transaction_type' => 'update',
                        'debit' => rand(100, 5000),
                        'credit' => 0,
                        'previous_balance' => 0,
                        'new_balance' => rand(100, 5000),
                        'statement' => "Debug txn {$suffix}",
                    ]),
                    default => throw new \RuntimeException("Unknown type: {$type}"),
                };
                $created++;
            }
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'created' => $created,
                'message' => $e->getMessage(),
            ], 422);
        }

        return response()->json(['success' => true, 'created' => $created, 'type' => $type]);
    }

    /**
     * Delete all debug/mock records (codes starting with DBG-).
     */
    public function debugClean(): JsonResponse
    {
        $deleted = 0;
        $deleted += \App\Models\Customer::where('customer_code', 'like', 'DBG-%')->delete();
        $deleted += \App\Models\Supplier::where('supplier_code', 'like', 'DBG-%')->delete();
        $deleted += \App\Models\TreasuryAccount::where('account_number', 'like', 'DBG-%')->delete();
        $deleted += \App\Models\LedgerLog::where('entity_code', 'like', 'DBG-%')->delete();
        $deleted += \App\Models\LedgerTransaction::where('entity_code', 'like', 'DBG-%')->delete();
        $deleted += \App\Models\LedgerLog::where('statement', 'like', 'Debug log %')->delete();
        $deleted += \App\Models\LedgerTransaction::where('statement', 'like', 'Debug txn %')->delete();

        return response()->json(['success' => true, 'deleted' => $deleted]);
    }

    /**
     * Debug status: show local DB counts and sync timestamps.
     */
    public function debugStatus(): JsonResponse
    {
        return response()->json([
            'counts' => [
                'customers' => \App\Models\Customer::count(),
                'suppliers' => \App\Models\Supplier::count(),
                'treasury_accounts' => \App\Models\TreasuryAccount::count(),
                'covenants' => \App\Models\Covenant::count(),
                'advances' => \App\Models\Advance::count(),
                'stock_items' => \App\Models\StockItem::count(),
                'stock_transactions' => \App\Models\StockTransaction::count(),
                'transaction_logs' => \App\Models\TransactionLog::count(),
                'ledger_logs' => \App\Models\LedgerLog::count(),
                'ledger_transactions' => \App\Models\LedgerTransaction::count(),
            ],
            'sync_meta' => \Illuminate\Support\Facades\DB::table('sync_meta')->pluck('value', 'key')->toArray(),
        ]);
    }
}
