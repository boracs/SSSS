<?php

declare(strict_types=1);

namespace App\Enums;

enum AuctionBidStatus: string
{
    case Winning = 'winning';
    case Outbid = 'outbid';

    public function label(): string
    {
        return match ($this) {
            self::Winning => 'Líder',
            self::Outbid  => 'Superada',
        };
    }
}
