<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TreasuryConfig extends Model
{
    protected $fillable = [
        'initialized', 'starting_capital', 'initialization_date',
        'fiscal_year_start', 'currency', 'notes', 'last_updated',
    ];

    protected $casts = [
        'initialized' => 'boolean',
        'starting_capital' => 'decimal:2',
        'initialization_date' => 'datetime',
        'fiscal_year_start' => 'date',
        'last_updated' => 'datetime',
    ];

    public static function current(): ?self
    {
        return static::first();
    }

    public static function getOrCreate(): self
    {
        return static::first() ?? static::create([
            'initialized' => false,
            'starting_capital' => 0,
            'currency' => 'EGP',
        ]);
    }
}
