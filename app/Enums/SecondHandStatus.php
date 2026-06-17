<?php

declare(strict_types=1);

namespace App\Enums;

enum SecondHandStatus: string
{
    case AVAILABLE = 'available';
    case RESERVED  = 'reserved';
    case SOLD      = 'sold';

    public function label(): string
    {
        return match($this) {
            self::AVAILABLE => 'Disponible',
            self::RESERVED  => 'Reservada',
            self::SOLD      => 'Vendida',
        };
    }

    public function badgeColor(): string
    {
        return match($this) {
            self::AVAILABLE => 'emerald',
            self::RESERVED  => 'amber',
            self::SOLD      => 'slate',
        };
    }

    public function isPubliclyListed(): bool
    {
        return true;
    }
}