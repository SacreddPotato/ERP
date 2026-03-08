<?php

namespace App\Livewire;

use App\Enums\Category;
use App\Enums\Unit;
use App\Services\StockService;
use Livewire\Attributes\On;
use Livewire\Component;

class StockTable extends Component
{
    public string $search = '';
    public string $filterCategory = '';
    public string $filterSupplier = '';
    public string $filterUnit = '';
    public string $lowStockThreshold = '';
    public string $sortBy = 'item_code';
    public string $sortDir = 'asc';

    public string $editingCode = '';
    public array $editData = [];
    public string $message = '';
    public string $messageType = 'success';

    protected function getFactory(): string
    {
        return session('currentFactory', config('enterprisflow.default_factory'));
    }

    #[On('stock-updated')]
    #[On('factory-changed')]
    public function refresh(): void {}

    public function sortTable(string $column): void
    {
        if ($this->sortBy === $column) {
            $this->sortDir = $this->sortDir === 'asc' ? 'desc' : 'asc';
        } else {
            $this->sortBy = $column;
            $this->sortDir = 'asc';
        }
    }

    public function startEdit(string $itemCode): void
    {
        $service = app(StockService::class);
        $item = $service->checkItemExists($itemCode, $this->getFactory());
        if ($item) {
            $this->editingCode = $itemCode;
            $this->editData = [
                'name' => $item->name,
                'category' => $item->category instanceof \BackedEnum ? $item->category->value : $item->category,
                'unit' => $item->unit instanceof \BackedEnum ? $item->unit->value : $item->unit,
                'supplier' => $item->supplier ?? '',
                'unit_price' => $item->unit_price,
                'min_stock' => $item->min_stock,
            ];
        }
    }

    public function saveEdit(): void
    {
        try {
            $service = app(StockService::class);
            $service->editItem($this->editingCode, $this->getFactory(), $this->editData);
            $this->editingCode = '';
            $this->message = __('msg_item_updated');
            $this->messageType = 'success';
        } catch (\Throwable $e) {
            $this->message = $e->getMessage();
            $this->messageType = 'error';
        }
    }

    public function cancelEdit(): void
    {
        $this->editingCode = '';
    }

    public function requestDelete(string $itemCode, string $name): void
    {
        $this->dispatch('show-delete-modal', type: 'stock', code: $itemCode, name: $name);
    }

    #[On('delete-confirmed')]
    public function handleDelete(string $type, string $code, string $password): void
    {
        if ($type !== 'stock') return;

        try {
            $service = app(StockService::class);
            $service->deleteItem($code, $this->getFactory(), $password);
            $this->message = __('msg_item_deleted');
            $this->messageType = 'success';
        } catch (\Throwable $e) {
            $this->message = $e->getMessage();
            $this->messageType = 'error';
        }
    }

    public function exportCsv(): void
    {
        $service = app(StockService::class);
        $csv = $service->exportToCsv($this->getFactory(), $this->getFilters());
        $this->dispatch('download-csv', content: $csv, filename: 'stock_export.csv');
    }

    protected function getFilters(): array
    {
        return array_filter([
            'search' => $this->search,
            'category' => $this->filterCategory,
            'supplier' => $this->filterSupplier,
            'unit' => $this->filterUnit,
            'low_stock' => $this->lowStockThreshold,
        ]);
    }

    public function render()
    {
        $service = app(StockService::class);
        $items = $service->getFilteredItems($this->getFactory(), $this->getFilters());

        // Sort
        $items = $items->sortBy($this->sortBy, SORT_REGULAR, $this->sortDir === 'desc');

        $lowStockAlerts = $service->getLowStockNotifications($this->getFactory());
        $suppliers = $service->getUniqueSuppliers($this->getFactory());

        return view('livewire.stock-table', [
            'items' => $items,
            'lowStockAlerts' => $lowStockAlerts,
            'suppliers' => $suppliers,
            'categories' => Category::cases(),
            'units' => Unit::cases(),
        ]);
    }
}
