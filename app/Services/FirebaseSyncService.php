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
use Google\Auth\Credentials\ServiceAccountCredentials;
use GuzzleHttp\Client;
use Illuminate\Support\Facades\DB;

class FirebaseSyncService
{
    protected Client $http;
    protected string $baseUrl;
    protected string $accessToken;
    protected const BATCH_SIZE = 500;

    public function __construct()
    {
        $credentialsPath = config('firebase.credentials');
        $projectId = config('firebase.project_id');

        $creds = new ServiceAccountCredentials(
            ['https://www.googleapis.com/auth/datastore'],
            json_decode(file_get_contents($credentialsPath), true)
        );
        $token = $creds->fetchAuthToken();
        $this->accessToken = $token['access_token'];

        $this->baseUrl = "https://firestore.googleapis.com/v1/projects/{$projectId}/databases/(default)/documents";
        $this->http = new Client(['timeout' => 60]);
    }

    protected function headers(): array
    {
        return [
            'Authorization' => "Bearer {$this->accessToken}",
            'Content-Type' => 'application/json',
        ];
    }

    // ─── Firestore collection name mapping ─────────────────────────

    protected function firestoreLedgerName(LedgerType $type): string
    {
        return match ($type) {
            LedgerType::Customer => 'customers',
            LedgerType::Supplier => 'suppliers',
            default => $type->value,
        };
    }

    // ─── Firestore REST helpers ──────────────────────────────────────

    protected function getAllDocuments(string $collectionPath): array
    {
        $documents = [];
        $pageToken = null;

        do {
            $url = "{$this->baseUrl}/{$collectionPath}?pageSize=300";
            if ($pageToken) {
                $url .= "&pageToken={$pageToken}";
            }

            $response = $this->http->get($url, ['headers' => $this->headers()]);
            $data = json_decode($response->getBody(), true);

            if (isset($data['documents'])) {
                foreach ($data['documents'] as $doc) {
                    $docId = basename($doc['name']);
                    $documents[$docId] = $this->decodeFields($doc['fields'] ?? []);
                }
            }

            $pageToken = $data['nextPageToken'] ?? null;
        } while ($pageToken);

        return $documents;
    }

    protected function getDocument(string $documentPath): ?array
    {
        try {
            $response = $this->http->get("{$this->baseUrl}/{$documentPath}", [
                'headers' => $this->headers(),
            ]);
            $data = json_decode($response->getBody(), true);
            return $this->decodeFields($data['fields'] ?? []);
        } catch (\GuzzleHttp\Exception\ClientException $e) {
            if ($e->getResponse()->getStatusCode() === 404) {
                return null;
            }
            throw $e;
        }
    }

    protected function setDocument(string $documentPath, array $data): void
    {
        $this->http->patch("{$this->baseUrl}/{$documentPath}", [
            'headers' => $this->headers(),
            'json' => ['fields' => $this->encodeFields($data)],
        ]);
    }

    protected function batchWrite(array $writes): void
    {
        $projectId = config('firebase.project_id');
        $url = "https://firestore.googleapis.com/v1/projects/{$projectId}/databases/(default)/documents:batchWrite";

        foreach (array_chunk($writes, self::BATCH_SIZE) as $chunk) {
            $this->http->post($url, [
                'headers' => $this->headers(),
                'json' => ['writes' => $chunk],
            ]);
        }
    }

    protected function decodeFields(array $fields): array
    {
        $result = [];
        foreach ($fields as $key => $value) {
            $result[$key] = $this->decodeValue($value);
        }
        return $result;
    }

    protected function decodeValue(array $value): mixed
    {
        if (isset($value['stringValue'])) return $value['stringValue'];
        if (isset($value['integerValue'])) return (string) $value['integerValue'];
        if (isset($value['doubleValue'])) return (string) $value['doubleValue'];
        if (isset($value['booleanValue'])) return $value['booleanValue'];
        if (isset($value['nullValue'])) return null;
        if (isset($value['timestampValue'])) return $value['timestampValue'];
        if (isset($value['arrayValue'])) {
            return array_map(fn($v) => $this->decodeValue($v), $value['arrayValue']['values'] ?? []);
        }
        if (isset($value['mapValue'])) {
            return $this->decodeFields($value['mapValue']['fields'] ?? []);
        }
        return null;
    }

    protected function encodeFields(array $data): array
    {
        $fields = [];
        foreach ($data as $key => $value) {
            $fields[$key] = $this->encodeValue($value);
        }
        return $fields;
    }

    protected function encodeValue(mixed $value): array
    {
        if (is_null($value)) return ['nullValue' => null];
        if (is_bool($value)) return ['booleanValue' => $value];
        if (is_int($value)) return ['integerValue' => (string) $value];
        if (is_float($value)) return ['doubleValue' => $value];
        if (is_string($value)) return ['stringValue' => $value];
        if ($value instanceof \DateTimeInterface) return ['stringValue' => $value->toIso8601String()];
        if (is_array($value)) {
            if (array_is_list($value)) {
                return ['arrayValue' => ['values' => array_map(fn($v) => $this->encodeValue($v), $value)]];
            }
            return ['mapValue' => ['fields' => $this->encodeFields($value)]];
        }
        return ['stringValue' => (string) $value];
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
        $writes = [];
        $projectId = config('firebase.project_id');

        foreach (Factory::cases() as $factory) {
            $items = StockItem::forFactory($factory->value)->get();
            foreach ($items as $item) {
                $docPath = "projects/{$projectId}/databases/(default)/documents/stock/{$factory->value}/items/{$item->item_code}";
                $writes[] = [
                    'update' => [
                        'name' => $docPath,
                        'fields' => $this->encodeFields($this->stockItemToFirestore($item)),
                    ],
                ];
            }
        }

        $this->batchWrite($writes);
        return count($writes);
    }

    protected function pushLedgerEntities(LedgerType $type): int
    {
        $model = $type->modelClass();
        $column = $type->codeColumn();
        $entities = $model::all();
        $writes = [];
        $projectId = config('firebase.project_id');
        $fsName = $this->firestoreLedgerName($type);

        foreach ($entities as $entity) {
            $docPath = "projects/{$projectId}/databases/(default)/documents/ledgers/{$fsName}/entries/{$entity->{$column}}";
            $data = $entity->toArray();
            foreach ($data as $key => $value) {
                if ($value instanceof \DateTimeInterface) {
                    $data[$key] = $value->toIso8601String();
                }
            }
            $writes[] = [
                'update' => [
                    'name' => $docPath,
                    'fields' => $this->encodeFields($data),
                ],
            ];
        }

        $this->batchWrite($writes);
        return count($writes);
    }

    protected function pushTreasuryConfig(): int
    {
        $config = TreasuryConfig::current();
        if (!$config) return 0;

        $data = $config->toArray();
        foreach ($data as $key => $value) {
            if ($value instanceof \DateTimeInterface) {
                $data[$key] = $value->toIso8601String();
            }
        }
        $this->setDocument('settings/treasury_config', $data);
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
        $writes = [];
        $projectId = config('firebase.project_id');

        foreach ($records as $record) {
            $docId = $docIdFn($record);
            $docPath = "projects/{$projectId}/databases/(default)/documents/{$collectionName}/{$docId}";
            $data = $record->toArray();
            foreach ($data as $key => $value) {
                if ($value instanceof \DateTimeInterface) {
                    $data[$key] = $value->toIso8601String();
                }
            }
            $writes[] = [
                'update' => [
                    'name' => $docPath,
                    'fields' => $this->encodeFields($data),
                ],
            ];
        }

        $this->batchWrite($writes);
        return count($writes);
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

        // Auto-fix: if treasury accounts exist but config says not initialized, correct it
        if (TreasuryAccount::exists()) {
            $config = TreasuryConfig::first();
            if ($config && !$config->initialized) {
                $config->update(['initialized' => true]);
            } elseif (!$config) {
                TreasuryConfig::create([
                    'initialized' => true,
                    'starting_capital' => 0,
                    'currency' => 'EGP',
                ]);
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
        $pulled = 0;
        $skipped = 0;

        foreach (Factory::cases() as $factory) {
            try {
                $docs = $this->getAllDocuments("stock/{$factory->value}/items");
            } catch (\Throwable) {
                continue;
            }

            foreach ($docs as $docId => $data) {
                $data['factory'] = $factory->value;
                $data['item_code'] = $data['id'] ?? $docId;
                unset($data['id'], $data['lastUpdated'], $data['syncedAt']);

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
        $model = $type->modelClass();
        $column = $type->codeColumn();
        $pulled = 0;
        $skipped = 0;
        $fsName = $this->firestoreLedgerName($type);

        try {
            $docs = $this->getAllDocuments("ledgers/{$fsName}/entries");
        } catch (\Throwable) {
            return compact('pulled', 'skipped');
        }

        foreach ($docs as $docId => $data) {
            $code = $data[$column] ?? $data['id'] ?? $docId;
            $data[$column] = $code;
            unset($data['id'], $data['lastUpdated'], $data['syncedAt']);

            // Clean empty enum values that would fail casting
            if (isset($data['payment_method']) && $data['payment_method'] === '') {
                $data['payment_method'] = null;
            }

            $existing = $model::where($column, $code)->first();
            if ($existing && $skipExisting) {
                $skipped++;
                continue;
            }

            try {
                if ($existing) {
                    $existing->update($data);
                } else {
                    $model::create($data);
                }
                $pulled++;
            } catch (\Throwable) {
                $skipped++;
            }
        }

        return compact('pulled', 'skipped');
    }

    protected function pullTreasuryConfig(bool $skipExisting): array
    {
        $data = $this->getDocument('settings/treasury_config');

        if (!$data) {
            return ['pulled' => 0, 'skipped' => 0];
        }

        unset($data['lastUpdated'], $data['syncedAt']);
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
        $pulled = 0;
        $skipped = 0;

        try {
            $docs = $this->getAllDocuments($collectionName);
        } catch (\Throwable) {
            return compact('pulled', 'skipped');
        }

        foreach ($docs as $docId => $data) {
            unset($data['id'], $data['lastUpdated'], $data['syncedAt']);

            // Remap field names from Firestore to local DB columns
            if (isset($data['entity_id']) && !isset($data['entity_code'])) {
                $data['entity_code'] = $data['entity_id'];
                unset($data['entity_id']);
            }
            if (isset($data['timestamp']) && !isset($data['logged_at'])) {
                $data['logged_at'] = $data['timestamp'];
                unset($data['timestamp']);
            }

            // Clean empty enum values
            if (isset($data['payment_method']) && $data['payment_method'] === '') {
                $data['payment_method'] = null;
            }

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

            try {
                $modelClass::create($data);
                $pulled++;
            } catch (\Throwable) {
                $skipped++;
            }
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
