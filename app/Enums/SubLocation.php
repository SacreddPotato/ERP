<?php

namespace App\Enums;

enum SubLocation: string
{
    case ProductionLine1 = 'production_line_1';
    case ProductionLine2 = 'production_line_2';
    case ProductionLine3 = 'production_line_3';
    case ProductionLine4 = 'production_line_4';
    case InternalTransfer = 'internal_transfer';

    public function label(): string
    {
        return match ($this) {
            self::ProductionLine1 => __('subloc_production_line_1'),
            self::ProductionLine2 => __('subloc_production_line_2'),
            self::ProductionLine3 => __('subloc_production_line_3'),
            self::ProductionLine4 => __('subloc_production_line_4'),
            self::InternalTransfer => __('internal_transfer_to'),
        };
    }
}
