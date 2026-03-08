<?php

namespace App\Enums;

enum Category: string
{
    case RawMaterials = 'raw_materials';
    case FinishedProduct = 'finished_product';
    case Packaging = 'packaging';

    public function label(): string
    {
        return match ($this) {
            self::RawMaterials => __('cat_raw_materials'),
            self::FinishedProduct => __('cat_finished_product'),
            self::Packaging => __('cat_packaging'),
        };
    }
}
