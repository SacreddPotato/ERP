<?php

namespace App\Console\Commands;

use App\Enums\LedgerType;
use App\Models\LedgerLog;
use App\Models\LedgerTransaction;
use Illuminate\Console\Command;

class RecalculateEntityBalances extends Command
{
    protected $signature = 'ledger:recalculate-balances {--dry-run : Show what would change without updating}';
    protected $description = 'Recalculate entity debit/credit/balance from actual transaction data';

    public function handle(): int
    {
        $dryRun = $this->option('dry-run');
        if ($dryRun) {
            $this->info('DRY RUN — no changes will be made.');
        }

        $totalFixed = 0;

        foreach (LedgerType::cases() as $type) {
            $model = $type->modelClass();
            $column = $type->codeColumn();
            $entities = $model::all();
            $fixed = 0;

            foreach ($entities as $entity) {
                $code = $entity->{$column};

                // Merge both tables with dedup (same logic as getEntityTransactions)
                $logs = LedgerLog::where('entity_code', $code)
                    ->where('ledger_type', $type->value)->get();
                $txns = LedgerTransaction::where('entity_code', $code)
                    ->where('ledger_type', $type->value)->get();

                $merged = $logs->merge($txns)
                    ->unique(fn ($item) => ($item->logged_at ?? '') . '|' . $item->entity_code . '|' . $item->debit . '|' . $item->credit);

                $actualDebit = $merged->sum('debit');
                $actualCredit = $merged->sum('credit');
                $opening = (float) $entity->opening_balance;
                $actualBalance = $opening + $actualDebit - $actualCredit;

                if (abs($entity->debit - $actualDebit) > 0.01 ||
                    abs($entity->credit - $actualCredit) > 0.01) {

                    $fixed++;
                    if ($fixed <= 5 || $this->getOutput()->isVerbose()) {
                        $this->line("  {$code}: debit {$entity->debit} → {$actualDebit}, credit {$entity->credit} → {$actualCredit}, balance {$entity->balance} → {$actualBalance}");
                    }

                    if (!$dryRun) {
                        $entity->debit = $actualDebit;
                        $entity->credit = $actualCredit;
                        $entity->balance = $actualBalance;
                        $entity->save();
                    }
                }
            }

            $this->info("{$type->value}: {$fixed}/{$entities->count()} entities " . ($dryRun ? 'need fixing' : 'fixed'));
            $totalFixed += $fixed;
        }

        $this->newLine();
        $this->info("Total: {$totalFixed} entities " . ($dryRun ? 'need fixing' : 'fixed') . '.');

        return 0;
    }
}
