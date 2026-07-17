<?php

declare(strict_types=1);

namespace App\Actions\Auctions;

use App\DTOs\Auctions\PlaceBidDto;
use App\Models\AuctionBid;
use App\Services\Auctions\AuctionBiddingService;

final class PlaceBidAction
{
    public function __construct(
        private readonly AuctionBiddingService $bidding,
    ) {}

    public function execute(PlaceBidDto $dto): AuctionBid
    {
        return $this->bidding->placeBid($dto);
    }
}
