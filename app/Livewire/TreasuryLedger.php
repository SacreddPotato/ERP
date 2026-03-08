<?php

namespace App\Livewire;

use App\Enums\LedgerType;
use App\Enums\PaymentMethod;
use App\Services\LedgerService;
use App\Services\TreasuryService;
use Livewire\Attributes\On;
use Livewire\Component;

class TreasuryLedger extends Component
{
    // Account form properties
    public string $accountNumber = '';
    public string $accountName = '';
    public string $registrationDate = '';
    public string $documentNumber = '';
    public string $openingBalance = '0';
    public string $debit = '0';
    public string $credit = '0';
    public string $paymentMethod = '';
    public string $statement = '';

    // Treasury initialization form properties
    public string $startingCapital = '0';
    public string $fiscalYearStart = '';
    public string $currency = 'EGP';
    public string $initNotes = '';

    public string $search = '';
    public bool $isExisting = false;
    public string $message = '';
    public string $messageType = 'success';
    public ?string $viewingTransactions = null;

    protected LedgerType $ledgerType = LedgerType::Treasury;

    public function checkAccount(): void
    {
        if (empty($this->accountNumber)) return;
        $service = app(LedgerService::class);
        $entity = $service->checkExists($this->ledgerType, $this->accountNumber);
        $this->isExisting = (bool) $entity;
        $this->message = $entity ? $this->accountNumber . ' - ' . __('account_exists') : __('account_new');
        $this->messageType = 'info';
    }

    public function save(): void
    {
        if (empty($this->accountNumber) || empty($this->accountName)) {
            $this->message = __('msg_fill_all');
            $this->messageType = 'error';
            return;
        }

        try {
            $service = app(LedgerService::class);
            $service->addOrUpdate($this->ledgerType, [
                'account_number' => $this->accountNumber,
                'account_name' => $this->accountName,
                'registration_date' => $this->registrationDate ?: null,
                'document_number' => $this->documentNumber ?: null,
                'opening_balance' => $this->openingBalance,
                'debit' => $this->debit,
                'credit' => $this->credit,
                'payment_method' => $this->paymentMethod ?: null,
                'statement' => $this->statement ?: null,
            ]);

            $this->message = __('msg_item_added');
            $this->messageType = 'success';
            $this->resetForm();
        } catch (\Throwable $e) {
            $this->message = $e->getMessage();
            $this->messageType = 'error';
        }
    }

    public function initialize(): void
    {
        if (empty($this->startingCapital) || (float) $this->startingCapital <= 0) {
            $this->message = __('msg_fill_all');
            $this->messageType = 'error';
            return;
        }

        try {
            $service = app(TreasuryService::class);
            $service->initialize(
                (float) $this->startingCapital,
                $this->fiscalYearStart ?: null,
                $this->currency ?: 'EGP',
                $this->initNotes ?: null
            );

            $this->message = __('msg_treasury_initialized');
            $this->messageType = 'success';
            $this->startingCapital = '0';
            $this->fiscalYearStart = '';
            $this->currency = 'EGP';
            $this->initNotes = '';
        } catch (\Throwable $e) {
            $this->message = $e->getMessage();
            $this->messageType = 'error';
        }
    }

    public function resetTreasury(): void
    {
        $this->dispatch('show-delete-modal', type: 'treasury_reset', code: 'TREASURY_CONFIG', name: __('treasury_reset'));
    }

    public function requestDelete(string $code, string $name): void
    {
        $this->dispatch('show-delete-modal', type: 'treasury', code: $code, name: $name);
    }

    #[On('delete-confirmed')]
    public function handleDelete(string $type, string $code, string $password): void
    {
        if ($type === 'treasury_reset') {
            try {
                $service = app(TreasuryService::class);
                $service->resetInitialization($password);
                $this->message = __('msg_treasury_reset');
                $this->messageType = 'success';
            } catch (\Throwable $e) {
                $this->message = $e->getMessage();
                $this->messageType = 'error';
            }
            return;
        }

        if ($type !== 'treasury') return;
        try {
            $service = app(LedgerService::class);
            $service->deleteEntity($this->ledgerType, $code, $password);
            $this->message = __('msg_item_deleted');
            $this->messageType = 'success';
        } catch (\Throwable $e) {
            $this->message = $e->getMessage();
            $this->messageType = 'error';
        }
    }

    public function showTransactions(string $code): void
    {
        $this->viewingTransactions = $this->viewingTransactions === $code ? null : $code;
    }

    protected function resetForm(): void
    {
        $this->accountNumber = '';
        $this->accountName = '';
        $this->registrationDate = '';
        $this->documentNumber = '';
        $this->openingBalance = '0';
        $this->debit = '0';
        $this->credit = '0';
        $this->paymentMethod = '';
        $this->statement = '';
        $this->isExisting = false;
    }

    public function render()
    {
        $treasuryService = app(TreasuryService::class);
        $ledgerService = app(LedgerService::class);

        $summary = $treasuryService->getSummary();
        $config = $summary['config'];
        $entities = $ledgerService->getAll($this->ledgerType, array_filter(['search' => $this->search]));
        $totals = $ledgerService->getTotalBalance($this->ledgerType);
        $transactions = $this->viewingTransactions
            ? $ledgerService->getEntityTransactions($this->viewingTransactions, $this->ledgerType)
            : collect();

        return view('livewire.treasury-ledger', [
            'config' => $config,
            'summary' => $summary,
            'entities' => $entities,
            'totals' => $totals,
            'transactions' => $transactions,
            'paymentMethods' => PaymentMethod::cases(),
        ]);
    }
}
