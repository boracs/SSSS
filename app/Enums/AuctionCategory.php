<?php

declare(strict_types=1);

namespace App\Enums;

enum AuctionCategory: string
{
    case Surfboard = 'surfboard';
    case Wetsuit = 'wetsuit';
    case Accessory = 'accessory';
    case Other = 'other';

    public function label(): string
    {
        return match ($this) {
            self::Surfboard => 'Tabla de surf',
            self::Wetsuit   => 'Neopreno',
            self::Accessory => 'Accesorio',
            self::Other     => 'Otro',
        };
    }
}
