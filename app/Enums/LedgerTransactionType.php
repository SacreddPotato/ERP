<?php

namespace App\Enums;

enum LedgerTransactionType: string
{
    case New = 'جديد';
    case Update = 'تحديث';
    case Edit = 'تعديل';
    case Delete = 'حذف';
    case TreasuryInit = 'تهيئة الخزينة';

    public function isOperational(): bool
    {
        return match ($this) {
            self::New, self::Update => true,
            default => false,
        };
    }
}
