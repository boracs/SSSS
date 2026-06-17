<?php

declare(strict_types=1);

namespace App\Enums;

enum SecondHandBoardType: string
{
    case SOFTBOARD = 'softboard';
    case HARDBOARD = 'hardboard';

    public function label(): string
    {
        return match ($this) {
            self::SOFTBOARD => 'Softboard (Corcho / Espuma)',
            self::HARDBOARD => 'Hardboard (Fibra / Epoxy / Dura)',
        };
    }
}