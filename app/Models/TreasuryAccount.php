<?php

namespace App\Models;

use App\Enums\PaymentMethod;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;

class TreasuryAccount extends Model
{
    protected $fillable = [
        'account_number', 'account_name', 'registration_date',
        'document_number', 'opening_balance', 'debit', 'credit', 'balance',
        'payment_method', 'statement',
    ];

    protected $casts = [
        'registration_date' => 'date',
        'payment_method' => PaymentMethod::class,
        'opening_balance' => 'decimal:2',
        'debit' => 'decimal:2',
        'credit' => 'decimal:2',
        'balance' => 'decimal:2',
    ];

    public function scopeByAccountNumber(Builder $query, string $accountNumber): Builder
    {
        return $query->where('account_number', $accountNumber);
    }

    public function scopeSearch(Builder $query, string $term): Builder
    {
        return $query->where(function ($q) use ($term) {
            $q->where('account_number', 'like', "%{$term}%")
              ->orWhere('account_name', 'like', "%{$term}%");
        });
    }

    public function recalculateBalance(): void
    {
        $this->balance = $this->opening_balance + $this->debit - $this->credit;
    }
}
