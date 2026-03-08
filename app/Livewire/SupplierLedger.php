<?php

namespace App\Livewire;

use App\Enums\LedgerType;
use App\Enums\PaymentMethod;
use App\Services\LedgerService;
use Livewire\Attributes\On;
use Livewire\Component;

class SupplierLedger extends Component
{
    public string $entityCode = '';
    public string $name = '';
    public string $phone = '';
    public string $email = '';
    public string $registrationDate = '';
    public string $documentNumber = '';
    public string $openingBalance = '0';
    public string $debit = '0';
    public string $credit = '0';
    public string $paymentMethod = '';
    public string $statement = '';

    public string $search = '';
    public bool $isExisting = false;
    public string $message = '';
    public string $messageType = 'success';
    public ?string $viewingTransactions = null;

    protected LedgerType $ledgerType = LedgerType::Supplier;

    public function generateId(): void
    {
        $service = app(LedgerService::class);
        $this->entityCode = $service->generateNextCode($this->ledgerType);
    }

    public function checkId(): void
    {
        if (empty($this->entityCode)) return;
        $service = app(LedgerService::class);
        $entity = $service->checkExists($this->ledgerType, $this->entityCode);
        $this->isExisting = (bool) $entity;
        $this->message = $entity ? $this->entityCode . ' - ' . __('account_exists') : __('account_new');
        $this->messageType = 'info';
    }

    public function save(): void
    {
        if (empty($this->entityCode) || empty($this->name)) {
            $this->message = __('msg_fill_all');
            $this->messageType = 'error';
            return;
        }

        try {
            $service = app(LedgerService::class);
            $service->addOrUpdate($this->ledgerType, [
                'supplier_code' => $this->entityCode,
                'name' => $this->name,
                'phone' => $this->phone,
                'email' => $this->email,
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

    public function requestDelete(string $code, string $name): void
    {
        $this->dispatch('show-delete-modal', type: 'supplier', code: $code, name: $name);
    }

    #[On('delete-confirmed')]
    public function handleDelete(string $type, string $code, string $password): void
    {
        if ($type !== 'supplier') return;
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
        $this->entityCode = '';
        $this->name = '';
        $this->phone = '';
        $this->email = '';
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
        $service = app(LedgerService::class);
        $entities = $service->getAll($this->ledgerType, array_filter(['search' => $this->search]));
        $totals = $service->getTotalBalance($this->ledgerType);
        $transactions = $this->viewingTransactions
            ? $service->getEntityTransactions($this->viewingTransactions, $this->ledgerType)
            : collect();

        return view('livewire.supplier-ledger', [
            'entities' => $entities,
            'totals' => $totals,
            'transactions' => $transactions,
            'paymentMethods' => PaymentMethod::cases(),
        ]);
    }
}
