<?php

namespace App\Console\Commands;

use App\Models\LedgerLog;
use App\Models\LedgerTransaction;
use App\Services\FirebaseSyncService;
use Illuminate\Console\Command;

class MigrateLedgerTransactions extends Command
{
    protected $signature = 'ledger:migrate-transactions
                            {--dry-run : Show counts without inserting}
                            {--skip-pull : Skip the force-pull step}
                            {--skip-push : Skip the push step}';

    protected $description = 'Migrate missing ledger_logs records into ledger_transactions, with Firebase force-pull before and push after';

    public function handle(): int
    {
        // Step 1: Force-pull from Firebase
        if (!$this->option('skip-pull')) {
            $this->info('Step 1/3: Force-pulling from Firebase...');
            try {
                $sync = app(FirebaseSyncService::class);
                $result = $sync->forcePull(function ($percent, $step) {
                    $this->output->write("\r  Pulling: {$percent}% ({$step})");
                });
                $this->newLine();
                $this->info("  Pulled {$result['pulled']} records.");
                if (!empty($result['errors'])) {
                    foreach ($result['errors'] as $err) {
                        $this->warn("  Warning: {$err}");
                    }
                }
            } catch (\Throwable $e) {
                $this->error("  Firebase pull failed: {$e->getMessage()}");
                $this->error('  Run with --skip-pull to skip this step and migrate local data only.');
                return 1;
            }
        } else {
            $this->info('Step 1/3: Skipping force-pull (--skip-pull)');
        }

        // Step 2: Migrate missing records
        $this->info('Step 2/3: Migrating missing ledger_logs → ledger_transactions...');

        $existingKeys = LedgerTransaction::all()
            ->map(fn ($t) => $this->dedupKey($t))
            ->flip()
            ->all();

        $missing = LedgerLog::all()->filter(
            fn ($log) => !isset($existingKeys[$this->dedupKey($log)])
        );

        $byType = $missing->groupBy(fn ($log) => $log->ledger_type->value ?? $log->ledger_type);

        $this->table(
            ['Ledger Type', 'Existing in ledger_transactions', 'In ledger_logs', 'Missing'],
            collect(['customer', 'supplier', 'treasury', 'covenant', 'advance'])->map(function ($type) use ($byType) {
                $logCount = LedgerLog::where('ledger_type', $type)->count();
                $txnCount = LedgerTransaction::where('ledger_type', $type)->count();
                $missingCount = isset($byType[$type]) ? $byType[$type]->count() : 0;
                return [$type, $txnCount, $logCount, $missingCount];
            })
        );

        $totalMissing = $missing->count();
        $this->info("  Total missing: {$totalMissing}");

        if ($totalMissing === 0) {
            $this->info('  Nothing to migrate.');
            return 0;
        }

        if ($this->option('dry-run')) {
            $this->warn('  Dry run — no records inserted. Remove --dry-run to execute.');
            return 0;
        }

        $bar = $this->output->createProgressBar($totalMissing);
        $bar->start();
        $inserted = 0;

        foreach ($missing as $log) {
            LedgerTransaction::create([
                'logged_at' => $log->logged_at,
                'transaction_date' => $log->transaction_date,
                'ledger_type' => $log->getRawOriginal('ledger_type'),
                'entity_code' => $log->entity_code,
                'entity_name' => $log->entity_name,
                'transaction_type' => $log->getRawOriginal('transaction_type'),
                'debit' => $log->getRawOriginal('debit'),
                'credit' => $log->getRawOriginal('credit'),
                'previous_balance' => $log->getRawOriginal('previous_balance'),
                'new_balance' => $log->getRawOriginal('new_balance'),
                'payment_method' => $log->getRawOriginal('payment_method'),
                'document_number' => $log->document_number,
                'statement' => $log->statement,
            ]);
            $inserted++;
            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info("  Inserted {$inserted} records into ledger_transactions.");

        // Step 3: Push to Firebase
        if (!$this->option('skip-push')) {
            $this->info('Step 3/3: Pushing to Firebase...');
            try {
                $sync = app(FirebaseSyncService::class);
                $result = $sync->pushAll(function ($percent, $step) {
                    $this->output->write("\r  Pushing: {$percent}% ({$step})");
                });
                $this->newLine();
                $this->info("  Pushed {$result['pushed']} records.");
                if (!empty($result['errors'])) {
                    foreach ($result['errors'] as $err) {
                        $this->warn("  Warning: {$err}");
                    }
                }
            } catch (\Throwable $e) {
                $this->error("  Firebase push failed: {$e->getMessage()}");
                $this->error('  Records were inserted locally. Push manually from the sync panel.');
                return 1;
            }
        } else {
            $this->info('Step 3/3: Skipping push (--skip-push)');
        }

        $this->info('Done!');
        return 0;
    }

    private function dedupKey($record): string
    {
        $loggedAt = $record->logged_at instanceof \DateTimeInterface
            ? $record->logged_at->format('Y-m-d H:i:s')
            : ($record->logged_at ?? '');

        return $loggedAt . '|' . $record->entity_code . '|' . $record->debit . '|' . $record->credit;
    }
}
