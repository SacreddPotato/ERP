<?php

namespace App\Enums;

enum StockTransactionType: string
{
    case Incoming = 'وارد';
    case Outgoing = 'صادر';
    case OpeningBalance = 'رصيد افتتاحي';
    case InternalTransferIn = 'تحويل داخلي (وارد)';
    case InternalTransferOut = 'تحويل داخلي (صادر)';
    case InternalTransferNewIn = 'تحويل داخلي (وارد جديد)';
    case Deleted = 'محذوف';
    case Edited = 'تعديل';

    public function isOperational(): bool
    {
        return match ($this) {
            self::Incoming,
            self::Outgoing,
            self::OpeningBalance,
            self::InternalTransferIn,
            self::InternalTransferOut,
            self::InternalTransferNewIn => true,
            default => false,
        };
    }
}
