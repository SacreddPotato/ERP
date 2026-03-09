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
use Illuminate\Support\Facades\Log;

class FirebaseSyncService
{
    protected Client $http;
    protected string $baseUrl;
    protected string $accessToken;
    protected string $projectId;
    protected const BATCH_SIZE = 500;

    public function __construct()
    {
        $credentialsPath = config('firebase.credentials');
        $this->projectId = config('firebase.project_id');

        if (!$credentialsPath || !file_exists($credentialsPath)) {
            throw new \RuntimeException('Firebase credentials file not found: ' . ($credentialsPath ?: '(not configured)'));
        }

        $keyData = json_decode(file_get_contents($credentialsPath), true);
        if (!is_array($keyData) || empty($keyData['client_email'])) {
            throw new \RuntimeException('Firebase credentials file is invalid or missing the client_email field.');
        }

        $creds = new ServiceAccountCredentials(
            ['https://www.googleapis.com/auth/datastore'],
            $keyData
        );
        $token = $creds->fetchAuthToken();
        $this->accessToken = $token['access_token'];

        $this->baseUrl = "https://firestore.googleapis.com/v1/projects/{$this->projectId}/databases/(default)/documents";
        $this->http = new Client(['timeout' => 120]);
    }

    protected function headers(): array
    {
        return [
            'Authorization' => "Bearer {$this->accessToken}",
            'Content-Type' => 'application/json',
        ];
    }

    // ─── Persistent sync timestamps (survives cache clears / app restarts) ──

    protected function getSyncTimestamp(string $key): ?string
    {
        return DB::table('sync_meta')->where('key', $key)->value('value');
    }

    protected function setSyncTimestamp(string $key, string $value): void
    {
        DB::table('sync_meta')->updateOrInsert(['key' => $key], ['value' => $value]);
    }

    protected function clearSyncTimestamps(): void
    {
        DB::table('sync_meta')->truncate();
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

    /**
     * List all documents in a collection (paginated).
     * Each document returned counts as 1 Firestore read.
     */
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

    /**
     * Query documents modified since a given timestamp using runQuery.
     * Only returns documents with _lastUpdated > $since.
     * Each result document counts as 1 Firestore read (min 1 if empty).
     */
    protected function getDocumentsSince(string $collectionPath, string $since): array
    {
        // Parse "stock/bahbit/items" → parent="stock/bahbit", collectionId="items"
        $parts = explode('/', $collectionPath);
        $collectionId = array_pop($parts);
        $parentPath = implode('/', $parts);

        $url = $this->baseUrl;
        if ($parentPath) {
            $url .= "/{$parentPath}";
        }
        $url .= ':runQuery';

        $body = [
            'structuredQuery' => [
                'from' => [['collectionId' => $collectionId]],
                'where' => [
                    'fieldFilter' => [
                        'field' => ['fieldPath' => '_lastUpdated'],
                        'op' => 'GREATER_THAN',
                        'value' => ['stringValue' => $since],
                    ],
                ],
            ],
        ];

        $response = $this->http->post($url, [
            'headers' => $this->headers(),
            'json' => $body,
        ]);

        $documents = [];
        $results = json_decode($response->getBody(), true);
        foreach ($results as $result) {
            if (isset($result['document'])) {
                $doc = $result['document'];
                $docId = basename($doc['name']);
                $documents[$docId] = $this->decodeFields($doc['fields'] ?? []);
            }
        }

        return $documents;
    }

    /**
     * Get documents — uses delta query if $since is available.
     * Only falls back to full read if $since is null (first-ever sync).
     * Delta query errors are NOT silently swallowed — they propagate.
     */
    protected function getDocuments(string $collectionPath, ?string $since = null): array
    {
        if ($since) {
            return $this->getDocumentsSince($collectionPath, $since);
        }
        return $this->getAllDocuments($collectionPath);
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
        if (empty($writes)) return;

        $url = "https://firestore.googleapis.com/v1/projects/{$this->projectId}/databases/(default)/documents:batchWrite";

        foreach (array_chunk($writes, self::BATCH_SIZE) as $chunk) {
            $this->http->post($url, [
                'headers' => $this->headers(),
                'json' => ['writes' => $chunk],
            ]);
        }
    }

    // ─── Data encoding/decoding ────────────────────────────────────

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

    // ─── Data sanitization ─────────────────────────────────────────

    protected function sanitizeForModel(string $modelClass, array $data): array
    {
        // Remove meta fields from Firestore
        unset($data['id'], $data['lastUpdated'], $data['syncedAt'], $data['_lastUpdated']);
        unset($data['created_at'], $data['updated_at']);

        // Sanitize payment method (case-insensitive matching)
        if (array_key_exists('payment_method', $data)) {
            $data['payment_method'] = $this->sanitizePaymentMethod($data['payment_method']);
        }

        // Sanitize date fields
        foreach (['registration_date', 'transaction_date', 'initialization_date', 'fiscal_year_start'] as $dateField) {
            if (isset($data[$dateField]) && $data[$dateField] !== '') {
                try {
                    \Carbon\Carbon::parse($data[$dateField]);
                } catch (\Throwable) {
                    $data[$dateField] = null;
                }
            } elseif (isset($data[$dateField]) && $data[$dateField] === '') {
                $data[$dateField] = null;
            }
        }

        // Sanitize datetime fields
        foreach (['logged_at', 'last_updated'] as $dtField) {
            if (isset($data[$dtField]) && $data[$dtField] !== '') {
                try {
                    \Carbon\Carbon::parse($data[$dtField]);
                } catch (\Throwable) {
                    $data[$dtField] = null;
                }
            }
        }

        // Ensure numeric fields are actually numeric
        foreach (['opening_balance', 'debit', 'credit', 'balance', 'previous_balance', 'new_balance',
                   'starting_balance', 'total_incoming', 'total_outgoing', 'net_stock',
                   'unit_price', 'min_stock', 'quantity', 'previous_stock', 'new_stock',
                   'price', 'starting_capital'] as $numField) {
            if (isset($data[$numField]) && !is_numeric($data[$numField])) {
                $cleaned = preg_replace('/[^\d.\-]/', '', (string) $data[$numField]);
                $data[$numField] = $cleaned !== '' ? (float) $cleaned : 0;
            }
        }

        // Strip to fillable fields only
        $model = new $modelClass;
        $fillable = $model->getFillable();
        return array_intersect_key($data, array_flip($fillable));
    }

    protected function sanitizePaymentMethod(mixed $value): ?string
    {
        if (!$value || $value === '') return null;
        $lower = strtolower(trim((string) $value));
        $map = [
            'cash' => 'cash',
            'bank_transfer' => 'bank_transfer',
            'banktransfer' => 'bank_transfer',
            'bank transfer' => 'bank_transfer',
            'digital_wallet' => 'digital_wallet',
            'digitalwallet' => 'digital_wallet',
            'digital wallet' => 'digital_wallet',
            'check' => 'check',
            'cheque' => 'check',
        ];
        return $map[$lower] ?? null;
    }

    // ─── PUSH ───────────────────────────────────────────────────────

    public function pushAll(?callable $onProgress = null): array
    {
        $stats = ['pushed' => 0, 'errors' => []];
        $lastPush = $this->getSyncTimestamp('last_push_at');
        $now = now()->toIso8601String();

        $steps = ['stock', 'customers', 'suppliers', 'treasury', 'treasury_config', 'covenants', 'advances', 'stock_transactions', 'ledger_transactions', 'full_log', 'ledger_log'];
        $total = count($steps);

        foreach ($steps as $i => $step) {
            try {
                match ($step) {
                    'stock' => $stats['pushed'] += $this->pushStock($lastPush, $now),
                    'customers' => $stats['pushed'] += $this->pushLedgerEntities(LedgerType::Customer, $lastPush, $now),
                    'suppliers' => $stats['pushed'] += $this->pushLedgerEntities(LedgerType::Supplier, $lastPush, $now),
                    'treasury' => $stats['pushed'] += $this->pushLedgerEntities(LedgerType::Treasury, $lastPush, $now),
                    'treasury_config' => $stats['pushed'] += $this->pushTreasuryConfig($now),
                    'covenants' => $stats['pushed'] += $this->pushLedgerEntities(LedgerType::Covenant, $lastPush, $now),
                    'advances' => $stats['pushed'] += $this->pushLedgerEntities(LedgerType::Advance, $lastPush, $now),
                    'stock_transactions' => $stats['pushed'] += $this->pushStockTransactions($lastPush, $now),
                    'ledger_transactions' => $stats['pushed'] += $this->pushLedgerTransactions($lastPush, $now),
                    'full_log' => $stats['pushed'] += $this->pushTransactionLogs($lastPush, $now),
                    'ledger_log' => $stats['pushed'] += $this->pushLedgerLogs($lastPush, $now),
                };
            } catch (\Throwable $e) {
                $stats['errors'][] = "{$step}: {$e->getMessage()}";
            }

            if ($onProgress) {
                $onProgress(round(($i + 1) / $total * 100), $step);
            }
        }

        $this->setSyncTimestamp('last_push_at', $now);

        return $stats;
    }

    protected function pushStock(?string $since, string $now): int
    {
        $writes = [];

        foreach (Factory::cases() as $factory) {
            $query = StockItem::forFactory($factory->value);
            if ($since) {
                $query->where('updated_at', '>', $since);
            }
            $items = $query->get();

            foreach ($items as $item) {
                $docPath = "projects/{$this->projectId}/databases/(default)/documents/stock/{$factory->value}/items/{$item->item_code}";
                $data = $this->stockItemToFirestore($item);
                $data['_lastUpdated'] = $now;
                $writes[] = [
                    'update' => [
                        'name' => $docPath,
                        'fields' => $this->encodeFields($data),
                    ],
                ];
            }
        }

        $this->batchWrite($writes);
        return count($writes);
    }

    protected function pushLedgerEntities(LedgerType $type, ?string $since, string $now): int
    {
        $model = $type->modelClass();
        $column = $type->codeColumn();
        $query = $model::query();
        if ($since) {
            $query->where('updated_at', '>', $since);
        }
        $entities = $query->get();

        $writes = [];
        $fsName = $this->firestoreLedgerName($type);

        foreach ($entities as $entity) {
            $docPath = "projects/{$this->projectId}/databases/(default)/documents/ledgers/{$fsName}/entries/{$entity->{$column}}";
            $data = $entity->toArray();
            unset($data['id'], $data['created_at'], $data['updated_at']);
            foreach ($data as $key => $value) {
                if ($value instanceof \DateTimeInterface) {
                    $data[$key] = $value->toIso8601String();
                }
            }
            $data['_lastUpdated'] = $now;
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

    protected function pushTreasuryConfig(string $now): int
    {
        $config = TreasuryConfig::current();
        if (!$config) return 0;

        $data = $config->toArray();
        unset($data['id'], $data['created_at'], $data['updated_at']);
        foreach ($data as $key => $value) {
            if ($value instanceof \DateTimeInterface) {
                $data[$key] = $value->toIso8601String();
            }
        }
        $data['_lastUpdated'] = $now;
        $this->setDocument('settings/treasury_config', $data);
        return 1;
    }

    protected function pushStockTransactions(?string $since, string $now): int
    {
        $query = StockTransaction::query();
        if ($since) {
            $query->where('updated_at', '>', $since);
        }
        return $this->pushTransactionCollection(
            $query->get(),
            'stock_transactions',
            fn($t) => $t->logged_at->format('Y-m-d_H-i-s') . "_{$t->item_code}_{$t->factory}",
            $now
        );
    }

    protected function pushLedgerTransactions(?string $since, string $now): int
    {
        $count = 0;
        foreach (LedgerType::cases() as $type) {
            $query = LedgerTransaction::where('ledger_type', $type->value);
            if ($since) {
                $query->where('updated_at', '>', $since);
            }
            $transactions = $query->get();
            $collectionName = "{$type->value}_transactions";

            $count += $this->pushTransactionCollection(
                $transactions,
                $collectionName,
                fn($t) => $t->logged_at->format('Y-m-d_H-i-s') . "_{$t->entity_code}",
                $now
            );
        }
        return $count;
    }

    protected function pushTransactionLogs(?string $since, string $now): int
    {
        $query = TransactionLog::query();
        if ($since) {
            $query->where('updated_at', '>', $since);
        }
        return $this->pushTransactionCollection(
            $query->get(),
            'full_transactions_log',
            fn($t) => $t->logged_at->format('Y-m-d_H-i-s') . "_{$t->item_code}",
            $now
        );
    }

    protected function pushLedgerLogs(?string $since, string $now): int
    {
        $query = LedgerLog::query();
        if ($since) {
            $query->where('updated_at', '>', $since);
        }
        return $this->pushTransactionCollection(
            $query->get(),
            'ledger_log',
            fn($t) => $t->logged_at->format('Y-m-d_H-i-s') . "_{$t->entity_code}",
            $now
        );
    }

    protected function pushTransactionCollection($records, string $collectionName, callable $docIdFn, string $now): int
    {
        $writes = [];

        foreach ($records as $record) {
            $docId = $docIdFn($record);
            $docPath = "projects/{$this->projectId}/databases/(default)/documents/{$collectionName}/{$docId}";
            $data = $record->toArray();
            unset($data['id'], $data['created_at'], $data['updated_at']);
            foreach ($data as $key => $value) {
                if ($value instanceof \DateTimeInterface) {
                    $data[$key] = $value->toIso8601String();
                }
            }
            $data['_lastUpdated'] = $now;
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
        $lastPull = $this->getSyncTimestamp('last_pull_at');
        $now = now()->toIso8601String();

        $steps = ['stock', 'customers', 'suppliers', 'treasury', 'treasury_config', 'covenants', 'advances', 'stock_transactions', 'ledger_transactions', 'full_log', 'ledger_log'];
        $total = count($steps);

        foreach ($steps as $i => $step) {
            try {
                $result = match ($step) {
                    'stock' => $this->pullStock($skipExisting, $lastPull),
                    'customers' => $this->pullLedgerEntities(LedgerType::Customer, $skipExisting, $lastPull),
                    'suppliers' => $this->pullLedgerEntities(LedgerType::Supplier, $skipExisting, $lastPull),
                    'treasury' => $this->pullLedgerEntities(LedgerType::Treasury, $skipExisting, $lastPull),
                    'treasury_config' => $this->pullTreasuryConfig($skipExisting),
                    'covenants' => $this->pullLedgerEntities(LedgerType::Covenant, $skipExisting, $lastPull),
                    'advances' => $this->pullLedgerEntities(LedgerType::Advance, $skipExisting, $lastPull),
                    'stock_transactions' => $this->pullStockTransactions($skipExisting, $lastPull),
                    'ledger_transactions' => $this->pullLedgerTransactions($skipExisting, $lastPull),
                    'full_log' => $this->pullTransactionLogs($skipExisting, $lastPull),
                    'ledger_log' => $this->pullLedgerLogs($skipExisting, $lastPull),
                };
                $stats['pulled'] += $result['pulled'];
                $stats['skipped'] += $result['skipped'];
                if (!empty($result['errors'])) {
                    $stats['errors'] = array_merge($stats['errors'], $result['errors']);
                }
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

        $this->setSyncTimestamp('last_pull_at', $now);

        return $stats;
    }

    public function forcePull(?callable $onProgress = null): array
    {
        // Clear sync timestamps so we do a full pull
        $this->clearSyncTimestamps();

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

    /**
     * OPTIMIZED: Pre-load all existing local codes per factory in one query,
     * then skip matching Firestore docs without individual DB lookups.
     */
    protected function pullStock(bool $skipExisting, ?string $since): array
    {
        $pulled = 0;
        $skipped = 0;
        $errors = [];

        foreach (Factory::cases() as $factory) {
            try {
                $docs = $this->getDocuments("stock/{$factory->value}/items", $since);
            } catch (\Throwable $e) {
                $errors[] = "stock/{$factory->value}: {$e->getMessage()}";
                continue;
            }

            if (empty($docs)) continue;

            // Pre-load all existing item codes for this factory in ONE query
            $existingCodes = StockItem::where('factory', $factory->value)
                ->pluck('item_code')
                ->flip()
                ->all();

            foreach ($docs as $docId => $rawData) {
                $rawData['factory'] = $factory->value;
                $rawData['item_code'] = $rawData['id'] ?? $docId;

                $data = $this->sanitizeForModel(StockItem::class, $rawData);
                if (empty($data['item_code'])) {
                    $data['item_code'] = $docId;
                }
                $data['factory'] = $factory->value;

                $exists = isset($existingCodes[$data['item_code']]);

                if ($exists && $skipExisting) {
                    $skipped++;
                    continue;
                }

                try {
                    if ($exists) {
                        StockItem::where('item_code', $data['item_code'])
                            ->where('factory', $factory->value)
                            ->update($data);
                    } else {
                        StockItem::create($data);
                        $existingCodes[$data['item_code']] = true;
                    }
                    $pulled++;
                } catch (\Throwable $e) {
                    $errors[] = "stock/{$factory->value}/{$docId}: {$e->getMessage()}";
                    $skipped++;
                }
            }
        }

        return compact('pulled', 'skipped', 'errors');
    }

    /**
     * OPTIMIZED: Pre-load all existing entity codes in one query,
     * then skip matching Firestore docs without individual DB lookups.
     */
    protected function pullLedgerEntities(LedgerType $type, bool $skipExisting, ?string $since): array
    {
        $model = $type->modelClass();
        $column = $type->codeColumn();
        $pulled = 0;
        $skipped = 0;
        $errors = [];
        $fsName = $this->firestoreLedgerName($type);

        try {
            $docs = $this->getDocuments("ledgers/{$fsName}/entries", $since);
        } catch (\Throwable $e) {
            $errors[] = "{$type->value}: {$e->getMessage()}";
            return compact('pulled', 'skipped', 'errors');
        }

        if (empty($docs)) {
            return compact('pulled', 'skipped', 'errors');
        }

        // Pre-load all existing entity codes in ONE query
        $existingCodes = $model::pluck($column)->flip()->all();

        foreach ($docs as $docId => $rawData) {
            $code = $rawData[$column] ?? $rawData['id'] ?? $docId;
            $rawData[$column] = $code;

            $data = $this->sanitizeForModel($model, $rawData);
            $data[$column] = $code;

            $exists = isset($existingCodes[$code]);

            if ($exists && $skipExisting) {
                $skipped++;
                continue;
            }

            try {
                if ($exists) {
                    $model::where($column, $code)->update($data);
                } else {
                    $model::create($data);
                    $existingCodes[$code] = true;
                }
                $pulled++;
            } catch (\Throwable $e) {
                $errors[] = "{$type->value}/{$docId}: {$e->getMessage()}";
                $skipped++;
            }
        }

        return compact('pulled', 'skipped', 'errors');
    }

    /**
     * OPTIMIZED: Check local DB FIRST — skip Firestore read entirely if exists.
     */
    protected function pullTreasuryConfig(bool $skipExisting): array
    {
        $errors = [];

        // Check local DB FIRST to avoid unnecessary Firestore read
        if ($skipExisting && TreasuryConfig::exists()) {
            return ['pulled' => 0, 'skipped' => 1, 'errors' => $errors];
        }

        try {
            $data = $this->getDocument('settings/treasury_config');
        } catch (\Throwable $e) {
            $errors[] = "treasury_config: {$e->getMessage()}";
            return ['pulled' => 0, 'skipped' => 0, 'errors' => $errors];
        }

        if (!$data) {
            return ['pulled' => 0, 'skipped' => 0, 'errors' => $errors];
        }

        $data = $this->sanitizeForModel(TreasuryConfig::class, $data);
        $existing = TreasuryConfig::first();

        try {
            if ($existing) {
                $existing->update($data);
            } else {
                TreasuryConfig::create($data);
            }
        } catch (\Throwable $e) {
            $errors[] = "treasury_config: {$e->getMessage()}";
            return ['pulled' => 0, 'skipped' => 1, 'errors' => $errors];
        }

        return ['pulled' => 1, 'skipped' => 0, 'errors' => $errors];
    }

    protected function pullStockTransactions(bool $skipExisting, ?string $since): array
    {
        return $this->pullTransactionCollection(
            'stock_transactions',
            StockTransaction::class,
            ['logged_at', 'item_code'],
            $skipExisting,
            $since
        );
    }

    protected function pullLedgerTransactions(bool $skipExisting, ?string $since): array
    {
        $pulled = 0;
        $skipped = 0;
        $errors = [];

        foreach (LedgerType::cases() as $type) {
            $result = $this->pullTransactionCollection(
                "{$type->value}_transactions",
                LedgerTransaction::class,
                ['logged_at', 'entity_code'],
                $skipExisting,
                $since
            );
            $pulled += $result['pulled'];
            $skipped += $result['skipped'];
            if (!empty($result['errors'])) {
                $errors = array_merge($errors, $result['errors']);
            }
        }

        return compact('pulled', 'skipped', 'errors');
    }

    protected function pullTransactionLogs(bool $skipExisting, ?string $since): array
    {
        return $this->pullTransactionCollection(
            'full_transactions_log',
            TransactionLog::class,
            ['logged_at', 'item_code'],
            $skipExisting,
            $since
        );
    }

    protected function pullLedgerLogs(bool $skipExisting, ?string $since): array
    {
        return $this->pullTransactionCollection(
            'ledger_log',
            LedgerLog::class,
            ['logged_at', 'entity_code'],
            $skipExisting,
            $since
        );
    }

    /**
     * OPTIMIZED: Pre-load all existing dedup keys in one query using
     * a composite key set, then check membership in-memory instead of
     * N individual exists() queries.
     */
    protected function pullTransactionCollection(string $collectionName, string $modelClass, array $dedupKeys, bool $skipExisting, ?string $since): array
    {
        $pulled = 0;
        $skipped = 0;
        $errors = [];

        try {
            $docs = $this->getDocuments($collectionName, $since);
        } catch (\Throwable $e) {
            $errors[] = "{$collectionName}: {$e->getMessage()}";
            return compact('pulled', 'skipped', 'errors');
        }

        if (empty($docs)) {
            return compact('pulled', 'skipped', 'errors');
        }

        // Pre-load existing dedup key combinations in ONE query
        $existingKeys = [];
        if ($skipExisting && count($dedupKeys) >= 2) {
            $rows = $modelClass::select($dedupKeys)->get();
            foreach ($rows as $row) {
                $compositeKey = implode('|', array_map(fn($k) => (string) $row->{$k}, $dedupKeys));
                $existingKeys[$compositeKey] = true;
            }
        }

        foreach ($docs as $docId => $rawData) {
            // Remap field names from Firestore to local DB columns
            if (isset($rawData['entity_id']) && !isset($rawData['entity_code'])) {
                $rawData['entity_code'] = $rawData['entity_id'];
                unset($rawData['entity_id']);
            }
            if (isset($rawData['timestamp']) && !isset($rawData['logged_at'])) {
                $rawData['logged_at'] = $rawData['timestamp'];
                unset($rawData['timestamp']);
            }

            $data = $this->sanitizeForModel($modelClass, $rawData);

            if ($skipExisting && count($dedupKeys) >= 2) {
                $compositeKey = implode('|', array_map(fn($k) => (string) ($data[$k] ?? ''), $dedupKeys));
                if (isset($existingKeys[$compositeKey])) {
                    $skipped++;
                    continue;
                }
            }

            try {
                $modelClass::create($data);
                $pulled++;
                // Add to set so subsequent docs in same batch don't duplicate
                if (count($dedupKeys) >= 2) {
                    $compositeKey = implode('|', array_map(fn($k) => (string) ($data[$k] ?? ''), $dedupKeys));
                    $existingKeys[$compositeKey] = true;
                }
            } catch (\Throwable $e) {
                $errors[] = "{$collectionName}/{$docId}: {$e->getMessage()}";
                $skipped++;
            }
        }

        return compact('pulled', 'skipped', 'errors');
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
