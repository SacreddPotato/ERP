<?php

namespace App\Services;

use App\Enums\Factory;
use App\Enums\StockTransactionType;
use App\Models\StockItem;
use App\Models\TransactionLog;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class StockService
{
    public function __construct(
        protected TransactionLogger $logger
    ) {}

    public function generateNextId(string $factory): string
    {
        $maxCode = StockItem::forFactory($factory)
            ->where('item_code', 'like', 'ITEM-%')
            ->selectRaw("MAX(CAST(SUBSTR(item_code, 6) AS INTEGER)) as max_num")
            ->value('max_num');

        $next = ($maxCode ?? 0) + 1;
        return 'ITEM-' . str_pad($next, 3, '0', STR_PAD_LEFT);
    }

    public function checkItemExists(string $itemCode, string $factory): ?StockItem
    {
        return StockItem::where('item_code', $itemCode)
            ->where('factory', $factory)
            ->first();
    }

    public function addNewItem(array $data): StockItem
    {
        return DB::transaction(function () use ($data) {
            $startingBalance = (float) ($data['starting_balance'] ?? 0);
            $unitPrice = (float) ($data['unit_price'] ?? 0);

            $item = StockItem::create([
                'item_code' => $data['item_code'],
                'name' => $data['name'],
                'category' => $data['category'],
                'unit' => $data['unit'],
                'factory' => $data['factory'],
                'supplier' => $data['supplier'] ?? null,
                'starting_balance' => $startingBalance,
                'total_incoming' => 0,
                'total_outgoing' => 0,
                'net_stock' => $startingBalance,
                'unit_price' => $unitPrice,
                'min_stock' => $data['min_stock'] ?? 0,
                'last_updated' => now(),
            ]);

            $this->logger->logStockTransaction([
                'transaction_date' => $data['balance_date'] ?? null,
                'item_code' => $item->item_code,
                'item_name' => $item->name,
                'transaction_type' => StockTransactionType::OpeningBalance->value,
                'quantity' => $startingBalance,
                'previous_stock' => 0,
                'new_stock' => $startingBalance,
                'supplier' => $item->supplier,
                'price' => $unitPrice,
                'factory' => $item->factory,
            ]);

            return $item;
        });
    }

    public function updateStock(string $itemCode, string $factory, string $type, float $quantity, array $options = []): StockItem
    {
        return DB::transaction(function () use ($itemCode, $factory, $type, $quantity, $options) {
            $item = StockItem::where('item_code', $itemCode)
                ->where('factory', $factory)
                ->lockForUpdate()
                ->firstOrFail();

            $previousStock = (float) $item->net_stock;
            $txType = StockTransactionType::from($type);

            if ($txType === StockTransactionType::Incoming) {
                $item->total_incoming += $quantity;

                // Weighted average price calculation
                $newPrice = (float) ($options['price'] ?? 0);
                if ($newPrice > 0 && ($previousStock + $quantity) > 0) {
                    $totalValue = ($item->unit_price * $previousStock) + ($newPrice * $quantity);
                    $item->unit_price = $totalValue / ($previousStock + $quantity);
                }
            } elseif ($txType === StockTransactionType::Outgoing) {
                if ($quantity > $previousStock) {
                    throw new \RuntimeException(__('msg_insufficient_stock'));
                }
                $item->total_outgoing += $quantity;
            }

            $item->recalculateNetStock();
            $item->last_updated = now();
            $item->save();

            $notes = $options['notes'] ?? null;
            $supplier = $options['supplier'] ?? null;

            $this->logger->logStockTransaction([
                'transaction_date' => $options['transaction_date'] ?? null,
                'item_code' => $item->item_code,
                'item_name' => $item->name,
                'transaction_type' => $type,
                'quantity' => $quantity,
                'previous_stock' => $previousStock,
                'new_stock' => $item->net_stock,
                'supplier' => $supplier,
                'price' => $options['price'] ?? $item->unit_price,
                'document_type' => $options['document_type'] ?? null,
                'document_number' => $options['document_number'] ?? null,
                'notes' => $notes,
                'factory' => $factory,
            ]);

            return $item;
        });
    }

    public function handleInternalTransfer(string $itemCode, float $quantity, string $sourceFactory, string $destFactory, array $options = []): array
    {
        return DB::transaction(function () use ($itemCode, $quantity, $sourceFactory, $destFactory, $options) {
            // Deduct from source
            $sourceItem = StockItem::where('item_code', $itemCode)
                ->where('factory', $sourceFactory)
                ->lockForUpdate()
                ->firstOrFail();

            $previousSourceStock = (float) $sourceItem->net_stock;
            if ($quantity > $previousSourceStock) {
                throw new \RuntimeException(__('msg_insufficient_stock'));
            }

            $sourceItem->total_outgoing += $quantity;
            $sourceItem->recalculateNetStock();
            $sourceItem->last_updated = now();
            $sourceItem->save();

            $transferNotes = "[FROM:{$sourceFactory}|TO:{$destFactory}]";
            if (!empty($options['notes'])) {
                $transferNotes .= ' ' . $options['notes'];
            }

            $this->logger->logStockTransaction([
                'transaction_date' => $options['transaction_date'] ?? null,
                'item_code' => $sourceItem->item_code,
                'item_name' => $sourceItem->name,
                'transaction_type' => StockTransactionType::InternalTransferOut->value,
                'quantity' => $quantity,
                'previous_stock' => $previousSourceStock,
                'new_stock' => $sourceItem->net_stock,
                'price' => $sourceItem->unit_price,
                'document_type' => $options['document_type'] ?? null,
                'document_number' => $options['document_number'] ?? null,
                'notes' => $transferNotes,
                'factory' => $sourceFactory,
            ]);

            // Add to destination
            $destItem = StockItem::where('item_code', $itemCode)
                ->where('factory', $destFactory)
                ->lockForUpdate()
                ->first();

            if ($destItem) {
                $previousDestStock = (float) $destItem->net_stock;
                $destItem->total_incoming += $quantity;
                $destItem->recalculateNetStock();
                $destItem->last_updated = now();
                $destItem->save();

                $this->logger->logStockTransaction([
                    'transaction_date' => $options['transaction_date'] ?? null,
                    'item_code' => $destItem->item_code,
                    'item_name' => $destItem->name,
                    'transaction_type' => StockTransactionType::InternalTransferIn->value,
                    'quantity' => $quantity,
                    'previous_stock' => $previousDestStock,
                    'new_stock' => $destItem->net_stock,
                    'price' => $sourceItem->unit_price,
                    'document_type' => $options['document_type'] ?? null,
                    'document_number' => $options['document_number'] ?? null,
                    'notes' => $transferNotes,
                    'factory' => $destFactory,
                ]);
            } else {
                $destItem = StockItem::create([
                    'item_code' => $itemCode,
                    'name' => $sourceItem->name,
                    'category' => $sourceItem->category,
                    'unit' => $sourceItem->unit,
                    'factory' => $destFactory,
                    'supplier' => $sourceItem->supplier,
                    'starting_balance' => $quantity,
                    'total_incoming' => 0,
                    'total_outgoing' => 0,
                    'net_stock' => $quantity,
                    'unit_price' => $sourceItem->unit_price,
                    'min_stock' => 0,
                    'last_updated' => now(),
                ]);

                $this->logger->logStockTransaction([
                    'transaction_date' => $options['transaction_date'] ?? null,
                    'item_code' => $destItem->item_code,
                    'item_name' => $destItem->name,
                    'transaction_type' => StockTransactionType::InternalTransferNewIn->value,
                    'quantity' => $quantity,
                    'previous_stock' => 0,
                    'new_stock' => $quantity,
                    'price' => $sourceItem->unit_price,
                    'document_type' => $options['document_type'] ?? null,
                    'document_number' => $options['document_number'] ?? null,
                    'notes' => $transferNotes,
                    'factory' => $destFactory,
                ]);
            }

            return ['source' => $sourceItem, 'destination' => $destItem];
        });
    }

    public function editItem(string $itemCode, string $factory, array $data): StockItem
    {
        return DB::transaction(function () use ($itemCode, $factory, $data) {
            $item = StockItem::where('item_code', $itemCode)
                ->where('factory', $factory)
                ->lockForUpdate()
                ->firstOrFail();

            $changes = [];
            $previousStock = (float) $item->net_stock;

            foreach (['name', 'category', 'unit', 'supplier', 'unit_price', 'min_stock'] as $field) {
                if (isset($data[$field]) && $data[$field] != $item->{$field}) {
                    $oldVal = $item->{$field} instanceof \BackedEnum ? $item->{$field}->value : $item->{$field};
                    $changes[] = "{$field}: {$oldVal} → {$data[$field]}";
                    $item->{$field} = $data[$field];
                }
            }

            if (isset($data['starting_balance']) && (float) $data['starting_balance'] !== (float) $item->starting_balance) {
                $oldBalance = $item->starting_balance;
                $item->starting_balance = (float) $data['starting_balance'];
                $item->recalculateNetStock();
                $changes[] = "starting_balance: {$oldBalance} → {$data['starting_balance']}";
            }

            if (!empty($changes)) {
                $item->last_updated = now();
                $item->save();

                $this->logger->logStockTransaction([
                    'item_code' => $item->item_code,
                    'item_name' => $item->name,
                    'transaction_type' => StockTransactionType::Edited->value,
                    'quantity' => 0,
                    'previous_stock' => $previousStock,
                    'new_stock' => $item->net_stock,
                    'price' => $item->unit_price,
                    'notes' => implode(', ', $changes),
                    'factory' => $factory,
                ]);
            }

            return $item;
        });
    }

    public function deleteItem(string $itemCode, string $factory, string $password): bool
    {
        if ($password !== config('enterprisflow.delete_password')) {
            throw new \RuntimeException(__('msg_wrong_password'));
        }

        return DB::transaction(function () use ($itemCode, $factory) {
            $item = StockItem::where('item_code', $itemCode)
                ->where('factory', $factory)
                ->firstOrFail();

            $backup = $item->toArray();
            unset($backup['id'], $backup['created_at'], $backup['updated_at']);

            $this->logger->logStockTransaction([
                'item_code' => $item->item_code,
                'item_name' => $item->name,
                'transaction_type' => StockTransactionType::Deleted->value,
                'quantity' => $item->net_stock,
                'previous_stock' => $item->net_stock,
                'new_stock' => 0,
                'price' => $item->unit_price,
                'notes' => '[DELETED_ITEM:' . json_encode($backup) . ']',
                'factory' => $factory,
            ]);

            $item->delete();
            return true;
        });
    }

    public function reverseTransaction(int $logId, ?string $factory = null): bool
    {
        return DB::transaction(function () use ($logId, $factory) {
            $query = TransactionLog::where('id', $logId);
            if ($factory) {
                $query->where('factory', $factory);
            }
            $log = $query->firstOrFail();

            $txType = $log->transaction_type;

            // Check if already reversed
            if (str_contains($log->notes ?? '', '[REVERSED]')) {
                throw new \RuntimeException(__('already_reversed'));
            }

            // Handle deleted item restoration
            if ($txType === StockTransactionType::Deleted) {
                if (preg_match('/\[DELETED_ITEM:(.+?)\]/', $log->notes, $matches)) {
                    $backup = json_decode($matches[1], true);
                    if ($backup) {
                        StockItem::create($backup);
                    }
                }
            } else {
                $item = StockItem::where('item_code', $log->item_code)
                    ->where('factory', $log->factory)
                    ->lockForUpdate()
                    ->first();

                if ($item) {
                    $quantity = (float) $log->quantity;

                    if (in_array($txType, [StockTransactionType::Incoming, StockTransactionType::InternalTransferIn, StockTransactionType::InternalTransferNewIn, StockTransactionType::OpeningBalance])) {
                        $item->total_incoming = max(0, $item->total_incoming - $quantity);
                        if ($txType === StockTransactionType::OpeningBalance) {
                            $item->starting_balance = max(0, $item->starting_balance - $quantity);
                        }
                    } elseif (in_array($txType, [StockTransactionType::Outgoing, StockTransactionType::InternalTransferOut])) {
                        $item->total_outgoing = max(0, $item->total_outgoing - $quantity);
                    }

                    $item->recalculateNetStock();
                    $item->last_updated = now();
                    $item->save();
                }
            }

            // Mark original as reversed
            $log->update(['notes' => ($log->notes ? $log->notes . ' ' : '') . '[REVERSED]']);

            return true;
        });
    }

    public function getFilteredItems(string $factory, array $filters = []): Collection
    {
        $query = StockItem::forFactory($factory);

        if (!empty($filters['search'])) {
            $query->search($filters['search']);
        }
        if (!empty($filters['category'])) {
            $query->byCategory($filters['category']);
        }
        if (!empty($filters['supplier'])) {
            $query->where('supplier', $filters['supplier']);
        }
        if (!empty($filters['unit'])) {
            $query->where('unit', $filters['unit']);
        }
        if (!empty($filters['low_stock'])) {
            $threshold = (float) $filters['low_stock'];
            $query->where('net_stock', '<=', $threshold);
        }

        return $query->orderBy('item_code')->get();
    }

    public function getFilteredTransactions(array $filters = []): Collection
    {
        $query = TransactionLog::query();

        if (!empty($filters['factory'])) {
            $query->forFactory($filters['factory']);
        }
        if (!empty($filters['item_code'])) {
            $query->forItem($filters['item_code']);
        }
        if (!empty($filters['type'])) {
            $query->ofType($filters['type']);
        }
        if (!empty($filters['date_from']) || !empty($filters['date_to'])) {
            $query->dateRange($filters['date_from'] ?? null, $filters['date_to'] ?? null);
        }
        if (!empty($filters['trans_date_from']) || !empty($filters['trans_date_to'])) {
            $query->transactionDateRange($filters['trans_date_from'] ?? null, $filters['trans_date_to'] ?? null);
        }
        if (!empty($filters['keyword'])) {
            $query->keywordSearch($filters['keyword']);
        }
        if (!empty($filters['document_type'])) {
            $query->where('document_type', $filters['document_type']);
        }
        if (!empty($filters['document_number'])) {
            $query->where('document_number', 'like', "%{$filters['document_number']}%");
        }

        return $query->orderByDesc('logged_at')->get();
    }

    public function getLowStockNotifications(string $factory): Collection
    {
        return StockItem::forFactory($factory)->lowStock()->get();
    }

    public function getUniqueSuppliers(string $factory): array
    {
        return StockItem::forFactory($factory)
            ->whereNotNull('supplier')
            ->where('supplier', '!=', '')
            ->distinct()
            ->pluck('supplier')
            ->toArray();
    }

    public function exportToCsv(string $factory, array $filters = [], string $type = 'stock'): string
    {
        if ($type === 'stock') {
            $items = $this->getFilteredItems($factory, $filters);
            $headers = ['ID', 'Name', 'Category', 'Unit', 'Factory', 'Supplier', 'Starting', 'In', 'Out', 'Net Stock', 'Unit Price', 'Total Value', 'Min Stock', 'Last Updated'];
            $rows = $items->map(fn($item) => [
                $item->item_code, $item->name, $item->category?->value, $item->unit?->value,
                $item->factory?->value, $item->supplier, $item->starting_balance, $item->total_incoming,
                $item->total_outgoing, $item->net_stock, $item->unit_price,
                $item->net_stock * $item->unit_price, $item->min_stock, $item->last_updated,
            ]);
        } else {
            $transactions = $this->getFilteredTransactions($filters);
            $headers = ['Logged At', 'Trans. Date', 'Item ID', 'Item Name', 'Type', 'Quantity', 'Prev Stock', 'New Stock', 'Supplier', 'Price', 'Doc Type', 'Doc #', 'Notes', 'Factory'];
            $rows = $transactions->map(fn($t) => [
                $t->logged_at, $t->transaction_date, $t->item_code, $t->item_name,
                $t->transaction_type?->value, $t->quantity, $t->previous_stock, $t->new_stock,
                $t->supplier, $t->price, $t->document_type, $t->document_number, $t->notes, $t->factory?->value,
            ]);
        }

        $csv = implode(',', $headers) . "\n";
        foreach ($rows as $row) {
            $csv .= implode(',', array_map(fn($v) => '"' . str_replace('"', '""', (string) $v) . '"', $row)) . "\n";
        }

        return $csv;
    }
}
