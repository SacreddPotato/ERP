<?php

namespace App\Services;

use App\Enums\LedgerTransactionType;
use App\Enums\LedgerType;
use App\Models\LedgerLog;
use App\Models\LedgerTransaction;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class LedgerService
{
    public function __construct(
        protected TransactionLogger $logger
    ) {}

    public function generateNextCode(LedgerType $type): string
    {
        $prefix = $type->codePrefix();
        if (empty($prefix)) {
            return '';
        }

        $column = $type->codeColumn();
        $model = $type->modelClass();

        $maxCode = $model::where($column, 'like', "{$prefix}-%")
            ->selectRaw("MAX(CAST(SUBSTR({$column}, " . (strlen($prefix) + 2) . ") AS INTEGER)) as max_num")
            ->value('max_num');

        $next = ($maxCode ?? 0) + 1;
        return $prefix . '-' . str_pad($next, 3, '0', STR_PAD_LEFT);
    }

    public function checkExists(LedgerType $type, string $code): ?Model
    {
        $model = $type->modelClass();
        $column = $type->codeColumn();
        return $model::where($column, $code)->first();
    }

    public function addOrUpdate(LedgerType $type, array $data): Model
    {
        return DB::transaction(function () use ($type, $data) {
            $column = $type->codeColumn();
            $model = $type->modelClass();
            $code = $data[$column];

            $entity = $model::where($column, $code)->first();
            $isNew = !$entity;

            $nameColumn = $this->getNameColumn($type);
            $debit = (float) ($data['debit'] ?? 0);
            $credit = (float) ($data['credit'] ?? 0);

            if ($isNew) {
                $openingBalance = (float) ($data['opening_balance'] ?? 0);
                $balance = $openingBalance + $debit - $credit;

                $entityData = [
                    $column => $code,
                    $nameColumn => $data[$nameColumn],
                    'registration_date' => $data['registration_date'] ?? now()->toDateString(),
                    'document_number' => $data['document_number'] ?? null,
                    'opening_balance' => $openingBalance,
                    'debit' => $debit,
                    'credit' => $credit,
                    'balance' => $balance,
                    'payment_method' => $data['payment_method'] ?? null,
                    'statement' => $data['statement'] ?? null,
                ];

                if (in_array($type, [LedgerType::Customer, LedgerType::Supplier])) {
                    $entityData['phone'] = $data['phone'] ?? null;
                    $entityData['email'] = $data['email'] ?? null;
                } elseif (in_array($type, [LedgerType::Covenant, LedgerType::Advance])) {
                    $entityData['phone'] = $data['phone'] ?? null;
                }

                $entity = $model::create($entityData);

                $txType = LedgerTransactionType::New;
            } else {
                $previousBalance = (float) $entity->balance;
                $entity->debit += $debit;
                $entity->credit += $credit;
                $entity->recalculateBalance();

                if (!empty($data['payment_method'])) {
                    $entity->payment_method = $data['payment_method'];
                }
                if (!empty($data['document_number'])) {
                    $entity->document_number = $data['document_number'];
                }
                if (!empty($data['statement'])) {
                    $entity->statement = $data['statement'];
                }

                $entity->save();
                $txType = LedgerTransactionType::Update;
            }

            $this->logger->logLedgerTransaction($type, [
                'transaction_date' => $data['registration_date'] ?? null,
                'entity_code' => $code,
                'entity_name' => $entity->{$nameColumn},
                'transaction_type' => $txType->value,
                'debit' => $debit,
                'credit' => $credit,
                'previous_balance' => $isNew ? 0 : ($previousBalance ?? 0),
                'new_balance' => $entity->balance,
                'payment_method' => $data['payment_method'] ?? null,
                'document_number' => $data['document_number'] ?? null,
                'statement' => $data['statement'] ?? null,
            ]);

            return $entity;
        });
    }

    public function editEntity(LedgerType $type, string $code, array $data): Model
    {
        return DB::transaction(function () use ($type, $code, $data) {
            $column = $type->codeColumn();
            $model = $type->modelClass();
            $entity = $model::where($column, $code)->firstOrFail();

            $nameColumn = $this->getNameColumn($type);
            $changes = [];
            $previousBalance = (float) $entity->balance;

            $editableFields = [$nameColumn, 'phone', 'email', 'registration_date', 'document_number', 'payment_method', 'statement'];
            if ($type === LedgerType::Treasury) {
                $editableFields = ['account_name', 'registration_date', 'document_number', 'payment_method', 'statement'];
            }

            foreach ($editableFields as $field) {
                if (isset($data[$field]) && $data[$field] != $entity->{$field}) {
                    $oldVal = $entity->{$field} instanceof \BackedEnum ? $entity->{$field}->value : $entity->{$field};
                    $changes[] = "{$field}: {$oldVal} → {$data[$field]}";
                    $entity->{$field} = $data[$field];
                }
            }

            if (isset($data['opening_balance']) && (float) $data['opening_balance'] !== (float) $entity->opening_balance) {
                $oldOB = $entity->opening_balance;
                $entity->opening_balance = (float) $data['opening_balance'];
                $entity->recalculateBalance();
                $changes[] = "opening_balance: {$oldOB} → {$data['opening_balance']}";
            }

            if (!empty($changes)) {
                $entity->save();

                $this->logger->logLedgerTransaction($type, [
                    'entity_code' => $code,
                    'entity_name' => $entity->{$nameColumn},
                    'transaction_type' => LedgerTransactionType::Edit->value,
                    'debit' => 0,
                    'credit' => 0,
                    'previous_balance' => $previousBalance,
                    'new_balance' => $entity->balance,
                    'statement' => implode(', ', $changes),
                ]);
            }

            return $entity;
        });
    }

    public function deleteEntity(LedgerType $type, string $code, string $password): bool
    {
        if ($password !== config('enterprisflow.delete_password')) {
            throw new \RuntimeException(__('msg_wrong_password'));
        }

        return DB::transaction(function () use ($type, $code) {
            $column = $type->codeColumn();
            $model = $type->modelClass();
            $entity = $model::where($column, $code)->firstOrFail();

            $nameColumn = $this->getNameColumn($type);
            $backup = $entity->toArray();
            unset($backup['id'], $backup['created_at'], $backup['updated_at']);

            $this->logger->logLedgerTransaction($type, [
                'entity_code' => $code,
                'entity_name' => $entity->{$nameColumn},
                'transaction_type' => LedgerTransactionType::Delete->value,
                'debit' => 0,
                'credit' => 0,
                'previous_balance' => $entity->balance,
                'new_balance' => 0,
                'statement' => '[DELETED_ENTITY:' . json_encode($backup) . ']',
            ]);

            $entity->delete();
            return true;
        });
    }

    public function reverseTransaction(int $logId): bool
    {
        return DB::transaction(function () use ($logId) {
            $log = LedgerLog::findOrFail($logId);

            if (str_contains($log->statement ?? '', '[REVERSED]')) {
                throw new \RuntimeException(__('already_reversed'));
            }

            $type = LedgerType::from($log->ledger_type instanceof LedgerType ? $log->ledger_type->value : $log->ledger_type);
            $column = $type->codeColumn();
            $model = $type->modelClass();
            $txType = $log->transaction_type instanceof LedgerTransactionType ? $log->transaction_type : LedgerTransactionType::from($log->transaction_type);

            if ($txType === LedgerTransactionType::Delete) {
                // Reverse deletion → restore entity from backup
                if (preg_match('/\[DELETED_ENTITY:(.+?)\]/', $log->statement, $matches)) {
                    $backup = json_decode($matches[1], true);
                    if ($backup) {
                        $model::create($backup);
                    }
                }
            } elseif ($txType === LedgerTransactionType::New) {
                // Reverse creation → delete the entity entirely
                $entity = $model::where($column, $log->entity_code)->first();
                if ($entity) {
                    $backup = $entity->toArray();
                    unset($backup['id'], $backup['created_at'], $backup['updated_at']);
                    $entity->delete();
                    // Store backup in statement so it can be un-reversed if needed
                    $log->update([
                        'statement' => ($log->statement ? $log->statement . ' ' : '') . '[REVERSED] [DELETED_ENTITY:' . json_encode($backup) . ']',
                    ]);
                    return true;
                }
            } elseif ($txType === LedgerTransactionType::Edit) {
                // Reverse edit → replay old values from the change log in statement
                // Format: "field: old → new, field2: old2 → new2"
                $entity = $model::where($column, $log->entity_code)->first();
                if ($entity && $log->statement) {
                    $changes = explode(', ', $log->statement);
                    foreach ($changes as $change) {
                        if (preg_match('/^(\w+):\s*(.+?)\s*→\s*(.+)$/', trim($change), $m)) {
                            $field = $m[1];
                            $oldValue = $m[2];
                            if ($entity->isFillable($field)) {
                                $entity->{$field} = $oldValue;
                            }
                        }
                    }
                    if (method_exists($entity, 'recalculateBalance')) {
                        $entity->recalculateBalance();
                    }
                    $entity->save();
                }
            } else {
                // Reverse update → subtract debit/credit
                $entity = $model::where($column, $log->entity_code)->first();
                if ($entity) {
                    $entity->debit = max(0, $entity->debit - (float) $log->debit);
                    $entity->credit = max(0, $entity->credit - (float) $log->credit);
                    $entity->recalculateBalance();
                    $entity->save();
                }
            }

            $log->update([
                'statement' => ($log->statement ? $log->statement . ' ' : '') . '[REVERSED]',
            ]);

            return true;
        });
    }

    public function getAll(LedgerType $type, array $filters = [], int $perPage = 25, int $page = 1): array
    {
        $model = $type->modelClass();
        $query = $model::query();

        if (!empty($filters['search'])) {
            $query->search($filters['search']);
        }
        if (!empty($filters['payment_method'])) {
            $query->where('payment_method', $filters['payment_method']);
        }
        if (!empty($filters['document_number'])) {
            $query->where('document_number', 'like', "%{$filters['document_number']}%");
        }
        if (!empty($filters['statement'])) {
            $query->where('statement', 'like', "%{$filters['statement']}%");
        }
        if (!empty($filters['date_from'])) {
            $query->where('registration_date', '>=', $filters['date_from']);
        }
        if (!empty($filters['date_to'])) {
            $query->where('registration_date', '<=', $filters['date_to']);
        }

        $column = $type->codeColumn();
        $total = $query->count();
        $data = $query->orderBy($column)->skip(($page - 1) * $perPage)->take($perPage)->get();

        return ['data' => $data, 'total' => $total];
    }

    public function getTotalBalance(LedgerType $type): array
    {
        $model = $type->modelClass();
        return [
            'total_balance' => (float) $model::sum('balance'),
            'total_opening' => (float) $model::sum('opening_balance'),
            'total_debit' => (float) $model::sum('debit'),
            'total_credit' => (float) $model::sum('credit'),
            'count' => $model::count(),
        ];
    }

    public function getEntityTransactions(string $code, LedgerType $type): Collection
    {
        $logs = LedgerLog::where('entity_code', $code)
            ->where('ledger_type', $type->value)
            ->get();

        $txns = LedgerTransaction::where('entity_code', $code)
            ->where('ledger_type', $type->value)
            ->get();

        return $logs->merge($txns)
            ->unique(fn ($item) => ($item->logged_at ?? '') . '|' . $item->entity_code . '|' . $item->debit . '|' . $item->credit)
            ->sortBy([
                ['transaction_date', 'desc'],
                ['logged_at', 'desc'],
            ])
            ->values();
    }

    public function getEntityCodesWithMatchingTransactions(LedgerType $type, string $search): array
    {
        $logCodes = LedgerLog::where('ledger_type', $type->value)
            ->where('document_number', 'like', "%{$search}%")
            ->distinct()
            ->pluck('entity_code')
            ->toArray();

        $txnCodes = LedgerTransaction::where('ledger_type', $type->value)
            ->where('document_number', 'like', "%{$search}%")
            ->distinct()
            ->pluck('entity_code')
            ->toArray();

        return array_values(array_unique(array_merge($logCodes, $txnCodes)));
    }

    protected function getNameColumn(LedgerType $type): string
    {
        return match ($type) {
            LedgerType::Customer => 'name',
            LedgerType::Supplier => 'name',
            LedgerType::Treasury => 'account_name',
            LedgerType::Covenant => 'employee_name',
            LedgerType::Advance => 'employee_name',
        };
    }
}
