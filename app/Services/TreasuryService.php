<?php

namespace App\Services;

use App\Enums\LedgerTransactionType;
use App\Enums\LedgerType;
use App\Models\TreasuryAccount;
use App\Models\TreasuryConfig;
use Illuminate\Support\Facades\DB;

class TreasuryService
{
    public function __construct(
        protected TransactionLogger $logger
    ) {}

    public function getConfig(): TreasuryConfig
    {
        return TreasuryConfig::getOrCreate();
    }

    public function initialize(float $startingCapital, ?string $fiscalYearStart = null, string $currency = 'EGP', ?string $notes = null): TreasuryConfig
    {
        return DB::transaction(function () use ($startingCapital, $fiscalYearStart, $currency, $notes) {
            $config = TreasuryConfig::getOrCreate();

            if ($config->initialized) {
                throw new \RuntimeException('Treasury is already initialized.');
            }

            $config->update([
                'initialized' => true,
                'starting_capital' => $startingCapital,
                'initialization_date' => now(),
                'fiscal_year_start' => $fiscalYearStart,
                'currency' => $currency,
                'notes' => $notes,
                'last_updated' => now(),
            ]);

            $this->logger->logLedgerTransaction(LedgerType::Treasury, [
                'entity_code' => 'TREASURY_CONFIG',
                'entity_name' => 'Treasury Initialization',
                'transaction_type' => LedgerTransactionType::TreasuryInit->value,
                'debit' => $startingCapital,
                'credit' => 0,
                'previous_balance' => 0,
                'new_balance' => $startingCapital,
                'statement' => "Starting capital: {$startingCapital} {$currency}",
            ]);

            return $config;
        });
    }

    public function updateConfig(array $data): TreasuryConfig
    {
        $config = TreasuryConfig::getOrCreate();

        $updateData = [];
        if (isset($data['fiscal_year_start'])) {
            $updateData['fiscal_year_start'] = $data['fiscal_year_start'];
        }
        if (isset($data['currency'])) {
            $updateData['currency'] = $data['currency'];
        }
        if (isset($data['notes'])) {
            $updateData['notes'] = $data['notes'];
        }

        if (!empty($updateData)) {
            $updateData['last_updated'] = now();
            $config->update($updateData);
        }

        return $config;
    }

    public function resetInitialization(string $password): bool
    {
        if ($password !== config('enterprisflow.delete_password')) {
            throw new \RuntimeException(__('msg_wrong_password'));
        }

        if (TreasuryAccount::count() > 0) {
            throw new \RuntimeException('Cannot reset treasury while accounts exist. Delete all accounts first.');
        }

        $config = TreasuryConfig::getOrCreate();
        $config->update([
            'initialized' => false,
            'starting_capital' => 0,
            'initialization_date' => null,
            'fiscal_year_start' => null,
            'notes' => null,
            'last_updated' => now(),
        ]);

        return true;
    }

    public function getSummary(): array
    {
        $config = TreasuryConfig::getOrCreate();

        $accountStats = [
            'total_accounts' => TreasuryAccount::count(),
            'total_opening' => (float) TreasuryAccount::sum('opening_balance'),
            'total_debit' => (float) TreasuryAccount::sum('debit'),
            'total_credit' => (float) TreasuryAccount::sum('credit'),
            'total_balance' => (float) TreasuryAccount::sum('balance'),
        ];

        $netChange = $accountStats['total_debit'] - $accountStats['total_credit'];

        return [
            'config' => $config,
            'starting_capital' => (float) $config->starting_capital,
            'total_accounts' => $accountStats['total_accounts'],
            'total_opening' => $accountStats['total_opening'],
            'total_debit' => $accountStats['total_debit'],
            'total_credit' => $accountStats['total_credit'],
            'total_balance' => $accountStats['total_balance'],
            'net_change' => $netChange,
            'current_position' => (float) $config->starting_capital + $netChange,
        ];
    }
}
