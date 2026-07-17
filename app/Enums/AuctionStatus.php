<?php

declare(strict_types=1);

namespace App\Enums;

enum AuctionStatus: string
{
    case Draft = 'draft';
    case Live = 'live';
    case Ended = 'ended';
    case Settled = 'settled';
    case Cancelled = 'cancelled';

    public function label(): string
    {
        return match ($this) {
            self::Draft     => 'Borrador',
            self::Live      => 'En curso',
            self::Ended     => 'Finalizada',
            self::Settled   => 'Adjudicada',
            self::Cancelled => 'Cancelada',
        };
    }

    public function isPubliclyVisible(): bool
    {
        return in_array($this, [self::Live, self::Ended, self::Settled], true);
    }
}
