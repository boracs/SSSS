<?php

declare(strict_types=1);

namespace App\Enums;

enum ChatbotInteractionStatus: string
{
    case ACTIVE = 'active';
    case REQUIRES_HUMAN = 'requires_human';
    case RESOLVED = 'resolved';

    public function label(): string
    {
        return match ($this) {
            self::ACTIVE => 'Activa',
            self::REQUIRES_HUMAN => 'Requiere humano',
            self::RESOLVED => 'Resuelta',
        };
    }

    public function badgeColor(): string
    {
        return match ($this) {
            self::ACTIVE => 'emerald',
            self::REQUIRES_HUMAN => 'rose',
            self::RESOLVED => 'slate',
        };
    }
}
