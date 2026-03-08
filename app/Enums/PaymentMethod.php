<?php

namespace App\Enums;

enum PaymentMethod: string
{
    case Cash = 'cash';
    case BankTransfer = 'bank_transfer';
    case DigitalWallet = 'digital_wallet';
    case Check = 'check';

    public function label(): string
    {
        return match ($this) {
            self::Cash => __('payment_cash'),
            self::BankTransfer => __('payment_bank_transfer'),
            self::DigitalWallet => __('payment_digital_wallet'),
            self::Check => __('payment_check'),
        };
    }
}
