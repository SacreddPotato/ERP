<?php

namespace App\Services;

use App\Enums\LedgerTransactionType;
use App\Enums\LedgerType;
use App\Enums\StockTransactionType;
use App\Models\LedgerLog;
use App\Models\LedgerTransaction;
use App\Models\StockTransaction;
use App\Models\TransactionLog;

class TransactionLogger
{
    public function logStockTransaction(array $data): TransactionLog
    {
        $log = TransactionLog::create([
            'logged_at' => now(),
            'transaction_date' => $data['transaction_date'] ?? null,
            'item_code' => $data['item_code'],
            'item_name' => $data['item_name'],
            'transaction_type' => $data['transaction_type'],
            'quantity' => $data['quantity'] ?? 0,
            'previous_stock' => $data['previous_stock'] ?? 0,
            'new_stock' => $data['new_stock'] ?? 0,
            'supplier' => $data['supplier'] ?? null,
            'price' => $data['price'] ?? 0,
            'document_type' => $data['document_type'] ?? null,
            'document_number' => $data['document_number'] ?? null,
            'notes' => $data['notes'] ?? null,
            'factory' => $data['factory'],
        ]);

        $type = $data['transaction_type'];
        $stockType = $type instanceof StockTransactionType ? $type : StockTransactionType::tryFrom($type);

        if ($stockType && $stockType->isOperational()) {
            StockTransaction::create([
                'logged_at' => $log->logged_at,
                'transaction_date' => $log->transaction_date,
                'item_code' => $log->item_code,
                'item_name' => $log->item_name,
                'transaction_type' => $log->transaction_type,
                'quantity' => $log->quantity,
                'previous_stock' => $log->previous_stock,
                'new_stock' => $log->new_stock,
                'supplier' => $log->supplier,
                'price' => $log->price,
                'document_type' => $log->document_type,
                'document_number' => $log->document_number,
                'notes' => $log->notes,
                'factory' => $log->factory,
            ]);
        }

        return $log;
    }

    public function logLedgerTransaction(LedgerType $ledgerType, array $data): LedgerLog
    {
        $log = LedgerLog::create([
            'logged_at' => now(),
            'transaction_date' => $data['transaction_date'] ?? null,
            'ledger_type' => $ledgerType->value,
            'entity_code' => $data['entity_code'],
            'entity_name' => $data['entity_name'],
            'transaction_type' => $data['transaction_type'],
            'debit' => $data['debit'] ?? 0,
            'credit' => $data['credit'] ?? 0,
            'previous_balance' => $data['previous_balance'] ?? 0,
            'new_balance' => $data['new_balance'] ?? 0,
            'payment_method' => $data['payment_method'] ?? null,
            'document_number' => $data['document_number'] ?? null,
            'statement' => $data['statement'] ?? null,
        ]);

        $type = $data['transaction_type'];
        $ledgerTxType = $type instanceof LedgerTransactionType ? $type : LedgerTransactionType::tryFrom($type);

        if ($ledgerTxType && $ledgerTxType->isOperational()) {
            $debit = (float) ($data['debit'] ?? 0);
            $credit = (float) ($data['credit'] ?? 0);

            if ($debit > 0 || $credit > 0) {
                LedgerTransaction::create([
                    'logged_at' => $log->logged_at,
                    'transaction_date' => $log->transaction_date,
                    'ledger_type' => $log->ledger_type,
                    'entity_code' => $log->entity_code,
                    'entity_name' => $log->entity_name,
                    'transaction_type' => $log->transaction_type,
                    'debit' => $log->debit,
                    'credit' => $log->credit,
                    'previous_balance' => $log->previous_balance,
                    'new_balance' => $log->new_balance,
                    'payment_method' => $log->payment_method,
                    'document_number' => $log->document_number,
                    'statement' => $log->statement,
                ]);
            }
        }

        return $log;
    }
}
