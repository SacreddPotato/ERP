<?php

namespace App\Models;

use App\Enums\Category;
use App\Enums\Factory;
use App\Enums\Unit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;

class StockItem extends Model
{
    protected $fillable = [
        'item_code', 'name', 'category', 'unit', 'factory', 'supplier',
        'starting_balance', 'total_incoming', 'total_outgoing', 'net_stock',
        'unit_price', 'min_stock', 'last_updated',
    ];

    protected $casts = [
        'category' => Category::class,
        'unit' => Unit::class,
        'factory' => Factory::class,
        'starting_balance' => 'decimal:2',
        'total_incoming' => 'decimal:2',
        'total_outgoing' => 'decimal:2',
        'net_stock' => 'decimal:2',
        'unit_price' => 'decimal:2',
        'min_stock' => 'decimal:2',
        'last_updated' => 'datetime',
    ];

    public function scopeForFactory(Builder $query, Factory|string $factory): Builder
    {
        return $query->where('factory', $factory instanceof Factory ? $factory->value : $factory);
    }

    public function scopeLowStock(Builder $query): Builder
    {
        return $query->whereColumn('net_stock', '<=', 'min_stock')->where('min_stock', '>', 0);
    }

    public function scopeByCategory(Builder $query, Category|string $category): Builder
    {
        return $query->where('category', $category instanceof Category ? $category->value : $category);
    }

    public function scopeSearch(Builder $query, string $term): Builder
    {
        return $query->where(function ($q) use ($term) {
            $q->where('item_code', 'like', "%{$term}%")
              ->orWhere('name', 'like', "%{$term}%");
        });
    }

    public function recalculateNetStock(): void
    {
        $this->net_stock = $this->starting_balance + $this->total_incoming - $this->total_outgoing;
    }
}
