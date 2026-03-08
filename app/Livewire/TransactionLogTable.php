<?php

namespace App\Livewire;

use App\Enums\DocumentType;
use App\Enums\Factory;
use App\Enums\LedgerType;
use App\Enums\StockTransactionType;
use App\Models\LedgerLog;
use App\Models\TransactionLog;
use App\Services\LedgerService;
use App\Services\StockService;
use Livewire\Component;

class TransactionLogTable extends Component
{
    public string $logSource = 'stock';
    public string $keyword = '';
    public string $filterFactory = '';
    public string $filterType = '';
    public string $dateFrom = '';
    public string $dateTo = '';
    public string $transDateFrom = '';
    public string $transDateTo = '';
    public string $filterDocType = '';
    public string $filterDocNumber = '';

    public string $message = '';
    public string $messageType = 'success';

    public function setLogSource(string $source): void
    {
        $this->logSource = $source;
        $this->resetFilters();
    }

    public function reverseTransaction(int $id): void
    {
        try {
            if ($this->logSource === 'stock') {
                $service = app(StockService::class);
                $service->reverseTransaction($id);
            } else {
                $service = app(LedgerService::class);
                $service->reverseTransaction($id);
            }

            $this->message = __('msg_transaction_reversed');
            $this->messageType = 'success';
        } catch (\Throwable $e) {
            $this->message = $e->getMessage();
            $this->messageType = 'error';
        }
    }

    protected function resetFilters(): void
    {
        $this->keyword = '';
        $this->filterFactory = '';
        $this->filterType = '';
        $this->dateFrom = '';
        $this->dateTo = '';
        $this->transDateFrom = '';
        $this->transDateTo = '';
        $this->filterDocType = '';
        $this->filterDocNumber = '';
    }

    public function render()
    {
        if ($this->logSource === 'stock') {
            $logs = $this->getStockLogs();
        } else {
            $logs = $this->getLedgerLogs();
        }

        return view('livewire.transaction-log-table', [
            'logs' => $logs,
            'factories' => Factory::cases(),
            'stockTransactionTypes' => StockTransactionType::cases(),
            'ledgerTypes' => LedgerType::cases(),
            'documentTypes' => DocumentType::cases(),
        ]);
    }

    protected function getStockLogs()
    {
        $query = TransactionLog::query();

        if (!empty($this->keyword)) {
            $query->keywordSearch($this->keyword);
        }
        if (!empty($this->filterFactory)) {
            $query->forFactory($this->filterFactory);
        }
        if (!empty($this->filterType)) {
            $query->ofType($this->filterType);
        }
        if (!empty($this->dateFrom) || !empty($this->dateTo)) {
            $query->dateRange($this->dateFrom ?: null, $this->dateTo ?: null);
        }
        if (!empty($this->transDateFrom) || !empty($this->transDateTo)) {
            $query->transactionDateRange($this->transDateFrom ?: null, $this->transDateTo ?: null);
        }
        if (!empty($this->filterDocType)) {
            $query->where('document_type', $this->filterDocType);
        }
        if (!empty($this->filterDocNumber)) {
            $query->where('document_number', 'like', "%{$this->filterDocNumber}%");
        }

        return $query->orderByDesc('logged_at')->get();
    }

    protected function getLedgerLogs()
    {
        $query = LedgerLog::query();

        if (!empty($this->keyword)) {
            $query->keywordSearch($this->keyword);
        }
        if (!empty($this->filterType)) {
            $query->forLedgerType($this->filterType);
        }
        if (!empty($this->dateFrom) || !empty($this->dateTo)) {
            $query->dateRange($this->dateFrom ?: null, $this->dateTo ?: null);
        }
        if (!empty($this->transDateFrom) || !empty($this->transDateTo)) {
            $query->transactionDateRange($this->transDateFrom ?: null, $this->transDateTo ?: null);
        }
        if (!empty($this->filterDocNumber)) {
            $query->where('document_number', 'like', "%{$this->filterDocNumber}%");
        }

        return $query->orderByDesc('logged_at')->get();
    }
}
