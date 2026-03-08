<?php

namespace App\Models;

use App\Enums\Factory;
use App\Enums\StockTransactionType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;

class StockTransaction extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'logged_at', 'transaction_date', 'item_code', 'item_name',
        'transaction_type', 'quantity', 'previous_stock', 'new_stock',
        'supplier', 'price', 'document_type', 'document_number', 'notes', 'factory',
    ];

    protected $casts = [
        'logged_at' => 'datetime',
        'transaction_date' => 'date',
        'transaction_type' => StockTransactionType::class,
        'factory' => Factory::class,
        'quantity' => 'decimal:2',
        'previous_stock' => 'decimal:2',
        'new_stock' => 'decimal:2',
        'price' => 'decimal:2',
    ];

    public function scopeForFactory(Builder $query, string $factory): Builder
    {
        return $query->where('factory', $factory);
    }

    public function scopeForItem(Builder $query, string $itemCode): Builder
    {
        return $query->where('item_code', $itemCode);
    }

    public function scopeOfType(Builder $query, string $type): Builder
    {
        return $query->where('transaction_type', $type);
    }

    public function scopeDateRange(Builder $query, ?string $from, ?string $to): Builder
    {
        if ($from) $query->where('logged_at', '>=', $from);
        if ($to) $query->where('logged_at', '<=', $to . ' 23:59:59');
        return $query;
    }
}
