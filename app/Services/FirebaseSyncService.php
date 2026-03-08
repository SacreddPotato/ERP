<?php

namespace App\Services;

use App\Enums\Factory;
use App\Enums\LedgerType;
use App\Models\Advance;
use App\Models\Covenant;
use App\Models\Customer;
use App\Models\LedgerLog;
use App\Models\LedgerTransaction;
use App\Models\StockItem;
use App\Models\StockTransaction;
use App\Models\Supplier;
use App\Models\TransactionLog;
use App\Models\TreasuryAccount;
use App\Models\TreasuryConfig;
use Illuminate\Support\Facades\DB;
use Kreait\Firebase\Factory as FirebaseFactory;
use Kreait\Firebase\Contract\Firestore;

class FirebaseSyncService
{
    protected Firestore $firestore;
    protected const BATCH_SIZE = 500;

    public function __construct()
    {
        $factory = (new FirebaseFactory)
            ->withServiceAccount(config('firebase.credentials'))
            ->withProjectId(config('firebase.project_id'));

        $this->firestore = $factory->createFirestore();
    }

    // ─── PUSH ───────────────────────────────────────────────────────

    public function pushAll(?callable $onProgress = null): array
    {
        $stats = ['pushed' => 0, 'errors' => []];
        $steps = ['stock', 'customers', 'suppliers', 'treasury', 'treasury_config', 'covenants', 'advances', 'stock_transactions', 'ledger_transactions', 'full_log', 'ledger_log'];
        $total = count($steps);

        foreach ($steps as $i => $step) {
            try {
                match ($step) {
                    'stock' => $stats['pushed'] += $this->pushStock(),
                    'customers' => $stats['pushed'] += $this->pushLedgerEntities(LedgerType::Customer),
                    'suppliers' => $stats['pushed'] += $this->pushLedgerEntities(LedgerType::Supplier),
                    'treasury' => $stats['pushed'] += $this->pushLedgerEntities(LedgerType::Treasury),
                    'treasury_config' => $stats['pushed'] += $this->pushTreasuryConfig(),
                    'covenants' => $stats['pushed'] += $this->pushLedgerEntities(LedgerType::Covenant),
                    'advances' => $stats['pushed'] += $this->pushLedgerEntities(LedgerType::Advance),
                    'stock_transactions' => $stats['pushed'] += $this->pushStockTransactions(),
                    'ledger_transactions' => $stats['pushed'] += $this->pushLedgerTransactions(),
                    'full_log' => $stats['pushed'] += $this->pushTransactionLogs(),
                    'ledger_log' => $stats['pushed'] += $this->pushLedgerLogs(),
                };
            } catch (\Throwable $e) {
                $stats['errors'][] = "{$step}: {$e->getMessage()}";
            }

            if ($onProgress) {
                $onProgress(round(($i + 1) / $total * 100), $step);
            }
        }

        return $stats;
    }

    protected function pushStock(): int
    {
        $db = $this->firestore->database();
        $count = 0;

        foreach (Factory::cases() as $factory) {
            $items = StockItem::forFactory($factory->value)->get();
            $batches = $items->chunk(self::BATCH_SIZE);

            foreach ($batches as $chunk) {
                $batch = $db->bulkWriter();
                foreach ($chunk as $item) {
                    $ref = $db->collection('stock')->document($factory->value)
                        ->collection('items')->document($item->item_code);
                    $batch->set($ref, $this->stockItemToFirestore($item));
                    $count++;
                }
                $batch->flush();
            }
        }

        return $count;
    }

    protected function pushLedgerEntities(LedgerType $type): int
    {
        $db = $this->firestore->database();
        $model = $type->modelClass();
        $column = $type->codeColumn();
        $collectionPath = "ledgers/{$type->value}/entries";

        $entities = $model::all();
        $count = 0;

        foreach ($entities->chunk(self::BATCH_SIZE) as $chunk) {
            $batch = $db->bulkWriter();
            foreach ($chunk as $entity) {
                $ref = $db->collection('ledgers')->document($type->value)
                    ->collection('entries')->document($entity->{$column});
                $batch->set($ref, $entity->toArray());
                $count++;
            }
            $batch->flush();
        }

        return $count;
    }

    protected function pushTreasuryConfig(): int
    {
        $config = TreasuryConfig::current();
        if (!$config) return 0;

        $db = $this->firestore->database();
        $ref = $db->collection('settings')->document('treasury_config');
        $ref->set($config->toArray());
        return 1;
    }

    protected function pushStockTransactions(): int
    {
        return $this->pushTransactionCollection(
            StockTransaction::all(),
            'stock_transactions',
            fn($t) => $t->logged_at->format('Y-m-d_H-i-s') . "_{$t->item_code}_{$t->factory}"
        );
    }

    protected function pushLedgerTransactions(): int
    {
        $count = 0;
        foreach (LedgerType::cases() as $type) {
            $transactions = LedgerTransaction::where('ledger_type', $type->value)->get();
            $collectionName = "{$type->value}_transactions";

            $count += $this->pushTransactionCollection(
                $transactions,
                $collectionName,
                fn($t) => $t->logged_at->format('Y-m-d_H-i-s') . "_{$t->entity_code}"
            );
        }
        return $count;
    }

    protected function pushTransactionLogs(): int
    {
        return $this->pushTransactionCollection(
            TransactionLog::all(),
            'full_transactions_log',
            fn($t) => $t->logged_at->format('Y-m-d_H-i-s') . "_{$t->item_code}"
        );
    }

    protected function pushLedgerLogs(): int
    {
        return $this->pushTransactionCollection(
            LedgerLog::all(),
            'ledger_log',
            fn($t) => $t->logged_at->format('Y-m-d_H-i-s') . "_{$t->entity_code}"
        );
    }

    protected function pushTransactionCollection($records, string $collectionName, callable $docIdFn): int
    {
        $db = $this->firestore->database();
        $count = 0;

        foreach ($records->chunk(self::BATCH_SIZE) as $chunk) {
            $batch = $db->bulkWriter();
            foreach ($chunk as $record) {
                $docId = $docIdFn($record);
                $ref = $db->collection($collectionName)->document($docId);
                $data = $record->toArray();
                // Convert datetime objects to strings
                foreach ($data as $key => $value) {
                    if ($value instanceof \DateTimeInterface) {
                        $data[$key] = $value->toIso8601String();
                    }
                }
                $batch->set($ref, $data);
                $count++;
            }
            $batch->flush();
        }

        return $count;
    }

    // ─── PULL ───────────────────────────────────────────────────────

    public function pullAll(bool $skipExisting = true, ?callable $onProgress = null): array
    {
        $stats = ['pulled' => 0, 'skipped' => 0, 'errors' => []];
        $steps = ['stock', 'customers', 'suppliers', 'treasury', 'treasury_config', 'covenants', 'advances', 'stock_transactions', 'ledger_transactions', 'full_log', 'ledger_log'];
        $total = count($steps);

        foreach ($steps as $i => $step) {
            try {
                $result = match ($step) {
                    'stock' => $this->pullStock($skipExisting),
                    'customers' => $this->pullLedgerEntities(LedgerType::Customer, $skipExisting),
                    'suppliers' => $this->pullLedgerEntities(LedgerType::Supplier, $skipExisting),
                    'treasury' => $this->pullLedgerEntities(LedgerType::Treasury, $skipExisting),
                    'treasury_config' => $this->pullTreasuryConfig($skipExisting),
                    'covenants' => $this->pullLedgerEntities(LedgerType::Covenant, $skipExisting),
                    'advances' => $this->pullLedgerEntities(LedgerType::Advance, $skipExisting),
                    'stock_transactions' => $this->pullStockTransactions($skipExisting),
                    'ledger_transactions' => $this->pullLedgerTransactions($skipExisting),
                    'full_log' => $this->pullTransactionLogs($skipExisting),
                    'ledger_log' => $this->pullLedgerLogs($skipExisting),
                };
                $stats['pulled'] += $result['pulled'];
                $stats['skipped'] += $result['skipped'];
            } catch (\Throwable $e) {
                $stats['errors'][] = "{$step}: {$e->getMessage()}";
            }

            if ($onProgress) {
                $onProgress(round(($i + 1) / $total * 100), $step);
            }
        }

        return $stats;
    }

    public function forcePull(?callable $onProgress = null): array
    {
        DB::transaction(function () {
            StockItem::truncate();
            TransactionLog::truncate();
            StockTransaction::truncate();
            Customer::truncate();
            Supplier::truncate();
            TreasuryAccount::truncate();
            TreasuryConfig::truncate();
            Covenant::truncate();
            Advance::truncate();
            LedgerLog::truncate();
            LedgerTransaction::truncate();
        });

        return $this->pullAll(false, $onProgress);
    }

    protected function pullStock(bool $skipExisting): array
    {
        $db = $this->firestore->database();
        $pulled = 0;
        $skipped = 0;

        foreach (Factory::cases() as $factory) {
            $docs = $db->collection('stock')->document($factory->value)
                ->collection('items')->documents();

            foreach ($docs as $doc) {
                if (!$doc->exists()) continue;
                $data = $doc->data();
                $data['factory'] = $factory->value;
                $data['item_code'] = $data['id'] ?? $doc->id();
                unset($data['id']);

                $existing = StockItem::where('item_code', $data['item_code'])
                    ->where('factory', $factory->value)->first();

                if ($existing && $skipExisting) {
                    $skipped++;
                    continue;
                }

                if ($existing) {
                    $existing->update($data);
                } else {
                    StockItem::create($data);
                }
                $pulled++;
            }
        }

        return compact('pulled', 'skipped');
    }

    protected function pullLedgerEntities(LedgerType $type, bool $skipExisting): array
    {
        $db = $this->firestore->database();
        $model = $type->modelClass();
        $column = $type->codeColumn();
        $pulled = 0;
        $skipped = 0;

        $docs = $db->collection('ledgers')->document($type->value)
            ->collection('entries')->documents();

        foreach ($docs as $doc) {
            if (!$doc->exists()) continue;
            $data = $doc->data();
            $code = $data[$column] ?? $data['id'] ?? $doc->id();
            $data[$column] = $code;
            unset($data['id']);

            $existing = $model::where($column, $code)->first();
            if ($existing && $skipExisting) {
                $skipped++;
                continue;
            }

            if ($existing) {
                $existing->update($data);
            } else {
                $model::create($data);
            }
            $pulled++;
        }

        return compact('pulled', 'skipped');
    }

    protected function pullTreasuryConfig(bool $skipExisting): array
    {
        $db = $this->firestore->database();
        $doc = $db->collection('settings')->document('treasury_config')->snapshot();

        if (!$doc->exists()) {
            return ['pulled' => 0, 'skipped' => 0];
        }

        $data = $doc->data();
        $existing = TreasuryConfig::first();

        if ($existing && $skipExisting) {
            return ['pulled' => 0, 'skipped' => 1];
        }

        if ($existing) {
            $existing->update($data);
        } else {
            TreasuryConfig::create($data);
        }

        return ['pulled' => 1, 'skipped' => 0];
    }

    protected function pullStockTransactions(bool $skipExisting): array
    {
        return $this->pullTransactionCollection(
            'stock_transactions',
            StockTransaction::class,
            ['logged_at', 'item_code'],
            $skipExisting
        );
    }

    protected function pullLedgerTransactions(bool $skipExisting): array
    {
        $pulled = 0;
        $skipped = 0;

        foreach (LedgerType::cases() as $type) {
            $result = $this->pullTransactionCollection(
                "{$type->value}_transactions",
                LedgerTransaction::class,
                ['logged_at', 'entity_code'],
                $skipExisting
            );
            $pulled += $result['pulled'];
            $skipped += $result['skipped'];
        }

        return compact('pulled', 'skipped');
    }

    protected function pullTransactionLogs(bool $skipExisting): array
    {
        return $this->pullTransactionCollection(
            'full_transactions_log',
            TransactionLog::class,
            ['logged_at', 'item_code'],
            $skipExisting
        );
    }

    protected function pullLedgerLogs(bool $skipExisting): array
    {
        return $this->pullTransactionCollection(
            'ledger_log',
            LedgerLog::class,
            ['logged_at', 'entity_code'],
            $skipExisting
        );
    }

    protected function pullTransactionCollection(string $collectionName, string $modelClass, array $dedupKeys, bool $skipExisting): array
    {
        $db = $this->firestore->database();
        $pulled = 0;
        $skipped = 0;

        $docs = $db->collection($collectionName)->documents();

        foreach ($docs as $doc) {
            if (!$doc->exists()) continue;
            $data = $doc->data();
            unset($data['id']);

            if ($skipExisting && count($dedupKeys) >= 2) {
                $query = $modelClass::query();
                foreach ($dedupKeys as $key) {
                    if (isset($data[$key])) {
                        $query->where($key, $data[$key]);
                    }
                }
                if ($query->exists()) {
                    $skipped++;
                    continue;
                }
            }

            $modelClass::create($data);
            $pulled++;
        }

        return compact('pulled', 'skipped');
    }

    // ─── HELPERS ────────────────────────────────────────────────────

    protected function stockItemToFirestore(StockItem $item): array
    {
        return [
            'id' => $item->item_code,
            'name' => $item->name,
            'category' => $item->category instanceof \BackedEnum ? $item->category->value : $item->category,
            'unit' => $item->unit instanceof \BackedEnum ? $item->unit->value : $item->unit,
            'location' => $item->factory instanceof \BackedEnum ? $item->factory->value : $item->factory,
            'supplier' => $item->supplier ?? '',
            'starting_balance' => (string) $item->starting_balance,
            'total_incoming' => (string) $item->total_incoming,
            'total_outgoing' => (string) $item->total_outgoing,
            'net_stock' => (string) $item->net_stock,
            'unit_price' => (string) $item->unit_price,
            'min_stock' => (string) $item->min_stock,
            'last_updated' => $item->last_updated?->toIso8601String() ?? '',
        ];
    }
}
