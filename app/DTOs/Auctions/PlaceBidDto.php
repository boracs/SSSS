<?php

declare(strict_types=1);

namespace App\DTOs\Auctions;

final readonly class PlaceBidDto
{
    public function __construct(
        public int $auctionId,
        public int $userId,
        public int $amountCents,
    ) {}
}
