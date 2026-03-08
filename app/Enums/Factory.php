<?php

namespace App\Enums;

enum Factory: string
{
    case Bahbit = 'bahbit';
    case OldFactory = 'old_factory';
    case Station = 'station';
    case Thaabaneya = 'thaabaneya';

    public function label(): string
    {
        return match ($this) {
            self::Bahbit => __('loc_bahbit'),
            self::OldFactory => __('loc_old_factory'),
            self::Station => __('loc_station'),
            self::Thaabaneya => __('loc_thaabaneya'),
        };
    }
}
