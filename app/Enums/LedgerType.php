<?php

namespace App\Enums;

enum LedgerType: string
{
    case Customer = 'customer';
    case Supplier = 'supplier';
    case Treasury = 'treasury';
    case Covenant = 'covenant';
    case Advance = 'advance';

    public function modelClass(): string
    {
        return match ($this) {
            self::Customer => \App\Models\Customer::class,
            self::Supplier => \App\Models\Supplier::class,
            self::Treasury => \App\Models\TreasuryAccount::class,
            self::Covenant => \App\Models\Covenant::class,
            self::Advance => \App\Models\Advance::class,
        };
    }

    public function codePrefix(): string
    {
        return match ($this) {
            self::Customer => 'CUST',
            self::Supplier => 'SUPP',
            self::Treasury => '',
            self::Covenant => 'COV',
            self::Advance => 'ADV',
        };
    }

    public function codeColumn(): string
    {
        return match ($this) {
            self::Customer => 'customer_code',
            self::Supplier => 'supplier_code',
            self::Treasury => 'account_number',
            self::Covenant => 'covenant_code',
            self::Advance => 'advance_code',
        };
    }
}
