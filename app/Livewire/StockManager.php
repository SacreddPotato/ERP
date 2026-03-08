<?php

namespace App\Livewire;

use App\Enums\Category;
use App\Enums\DocumentType;
use App\Enums\Factory;
use App\Enums\StockTransactionType;
use App\Enums\Unit;
use App\Services\StockService;
use Livewire\Attributes\On;
use Livewire\Component;

class StockManager extends Component
{
    // Item lookup
    public string $itemId = '';
    public ?array $existingItem = null;
    public bool $isNewItem = false;

    // New item form
    public string $name = '';
    public string $category = '';
    public string $unit = '';
    public string $supplier = '';
    public string $startingBalance = '0';
    public string $unitPrice = '0';
    public string $minStock = '0';
    public string $balanceDate = '';

    // Update stock form
    public string $transactionType = '';
    public string $quantity = '';
    public string $incomingSupplier = '';
    public string $shipmentPrice = '';
    public string $transactionDate = '';
    public string $documentType = '';
    public string $documentNumber = '';
    public string $notes = '';
    public string $transferFrom = '';
    public string $transferTo = '';

    public string $message = '';
    public string $messageType = 'success';

    protected function getFactory(): string
    {
        return session('currentFactory', config('enterprisflow.default_factory'));
    }

    public function generateId(): void
    {
        $service = app(StockService::class);
        $this->itemId = $service->generateNextId($this->getFactory());
    }

    public function checkId(): void
    {
        if (empty($this->itemId)) return;

        $service = app(StockService::class);
        $item = $service->checkItemExists($this->itemId, $this->getFactory());

        if ($item) {
            $this->existingItem = $item->toArray();
            $this->existingItem['category_label'] = $item->category?->label() ?? $item->category;
            $this->existingItem['unit_label'] = $item->unit?->label() ?? $item->unit;
            $this->existingItem['factory_label'] = $item->factory?->label() ?? $item->factory;
            $this->isNewItem = false;
            $this->message = $this->itemId . ' ' . __('msg_item_found');
            $this->messageType = 'info';
        } else {
            $this->existingItem = null;
            $this->isNewItem = true;
            $this->message = __('msg_new_item');
            $this->messageType = 'success';
        }
    }

    public function addItem(): void
    {
        if (empty($this->name) || empty($this->category) || empty($this->unit)) {
            $this->showMessage(__('msg_fill_all'), 'error');
            return;
        }

        try {
            $service = app(StockService::class);
            $service->addNewItem([
                'item_code' => $this->itemId,
                'name' => $this->name,
                'category' => $this->category,
                'unit' => $this->unit,
                'factory' => $this->getFactory(),
                'supplier' => $this->supplier,
                'starting_balance' => $this->startingBalance,
                'unit_price' => $this->unitPrice,
                'min_stock' => $this->minStock,
                'balance_date' => $this->balanceDate ?: null,
            ]);

            $this->showMessage(__('msg_item_added'), 'success');
            $this->resetForm();
            $this->dispatch('stock-updated');
        } catch (\Throwable $e) {
            $this->showMessage($e->getMessage(), 'error');
        }
    }

    public function updateStock(): void
    {
        if (empty($this->transactionType) || empty($this->quantity) || (float) $this->quantity <= 0) {
            $this->showMessage(__('msg_valid_quantity'), 'error');
            return;
        }

        try {
            $service = app(StockService::class);
            $factory = $this->getFactory();

            if ($this->transactionType === 'transfer') {
                if (empty($this->transferFrom) || empty($this->transferTo)) {
                    $this->showMessage(__('msg_fill_all'), 'error');
                    return;
                }
                $service->handleInternalTransfer(
                    $this->itemId,
                    (float) $this->quantity,
                    $this->transferFrom,
                    $this->transferTo,
                    [
                        'transaction_date' => $this->transactionDate ?: null,
                        'document_type' => $this->documentType ?: null,
                        'document_number' => $this->documentNumber ?: null,
                        'notes' => $this->notes ?: null,
                    ]
                );
            } else {
                $type = $this->transactionType === 'incoming'
                    ? StockTransactionType::Incoming->value
                    : StockTransactionType::Outgoing->value;

                $service->updateStock($this->itemId, $factory, $type, (float) $this->quantity, [
                    'supplier' => $this->incomingSupplier ?: null,
                    'price' => (float) ($this->shipmentPrice ?: 0),
                    'transaction_date' => $this->transactionDate ?: null,
                    'document_type' => $this->documentType ?: null,
                    'document_number' => $this->documentNumber ?: null,
                    'notes' => $this->notes ?: null,
                ]);
            }

            $this->showMessage(__('msg_stock_updated'), 'success');
            $this->checkId(); // Refresh item data
            $this->quantity = '';
            $this->incomingSupplier = '';
            $this->shipmentPrice = '';
            $this->notes = '';
            $this->dispatch('stock-updated');
        } catch (\Throwable $e) {
            $this->showMessage($e->getMessage(), 'error');
        }
    }

    #[On('factory-changed')]
    public function onFactoryChanged(): void
    {
        $this->resetForm();
    }

    protected function resetForm(): void
    {
        $this->itemId = '';
        $this->existingItem = null;
        $this->isNewItem = false;
        $this->name = '';
        $this->category = '';
        $this->unit = '';
        $this->supplier = '';
        $this->startingBalance = '0';
        $this->unitPrice = '0';
        $this->minStock = '0';
        $this->balanceDate = '';
        $this->transactionType = '';
        $this->quantity = '';
        $this->message = '';
    }

    protected function showMessage(string $msg, string $type): void
    {
        $this->message = $msg;
        $this->messageType = $type;
    }

    public function render()
    {
        return view('livewire.stock-manager', [
            'categories' => Category::cases(),
            'units' => Unit::cases(),
            'factories' => Factory::cases(),
            'documentTypes' => DocumentType::cases(),
        ]);
    }
}
