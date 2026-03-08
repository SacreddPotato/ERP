<?php

namespace App\Models;

use App\Enums\LedgerTransactionType;
use App\Enums\LedgerType;
use App\Enums\PaymentMethod;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;

class LedgerTransaction extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'logged_at', 'transaction_date', 'ledger_type', 'entity_code',
        'entity_name', 'transaction_type', 'debit', 'credit',
        'previous_balance', 'new_balance', 'payment_method',
        'document_number', 'statement',
    ];

    protected $casts = [
        'logged_at' => 'datetime',
        'transaction_date' => 'date',
        'ledger_type' => LedgerType::class,
        'transaction_type' => LedgerTransactionType::class,
        'payment_method' => PaymentMethod::class,
        'debit' => 'decimal:2',
        'credit' => 'decimal:2',
        'previous_balance' => 'decimal:2',
        'new_balance' => 'decimal:2',
    ];

    public function scopeForLedgerType(Builder $query, string $type): Builder
    {
        return $query->where('ledger_type', $type);
    }

    public function scopeForEntity(Builder $query, string $code): Builder
    {
        return $query->where('entity_code', $code);
    }

    public function scopeDateRange(Builder $query, ?string $from, ?string $to): Builder
    {
        if ($from) $query->where('logged_at', '>=', $from);
        if ($to) $query->where('logged_at', '<=', $to . ' 23:59:59');
        return $query;
    }
}
