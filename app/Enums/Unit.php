<?php

namespace App\Enums;

enum Unit: string
{
    case Kgs = 'kgs';
    case Litres = 'litres';
    case Pieces = 'pieces';
    case Boxes = 'boxes';
    case Metres = 'metres';
    case Units = 'units';
    case Packs = 'packs';
    case Pallets = 'pallets';

    public function label(): string
    {
        return match ($this) {
            self::Kgs => __('unit_kgs'),
            self::Litres => __('unit_litres'),
            self::Pieces => __('unit_pieces'),
            self::Boxes => __('unit_boxes'),
            self::Metres => __('unit_metres'),
            self::Units => __('unit_units'),
            self::Packs => __('unit_packs'),
            self::Pallets => __('unit_pallets'),
        };
    }
}
