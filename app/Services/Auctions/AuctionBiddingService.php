<?php

declare(strict_types=1);

namespace App\Services\Auctions;

use App\DTOs\Auctions\PlaceBidDto;
use App\Enums\AuctionBidStatus;
use App\Enums\AuctionStatus;
use App\Models\Auction;
use App\Models\AuctionBid;
use Illuminate\Support\Facades\DB;
use RuntimeException;

final class AuctionBiddingService
{
    public function placeBid(PlaceBidDto $dto): AuctionBid
    {
        return DB::transaction(function () use ($dto): AuctionBid {
            /** @var Auction|null $auction */
            $auction = Auction::query()
                ->whereKey($dto->auctionId)
                ->lockForUpdate()
                ->first();

            if ($auction === null) {
                throw new RuntimeException('Subasta no encontrada.');
            }

            if ($auction->status !== AuctionStatus::Live) {
                throw new RuntimeException('Esta subasta no acepta pujas.');
            }

            if ($auction->hasEndedByTime()) {
                throw new RuntimeException('El tiempo de la subasta ha terminado.');
            }

            $minimum = $auction->minimumNextBidCents();

            if ($dto->amountCents < $minimum) {
                throw new RuntimeException(
                    'La puja mínima actual es de '.number_format($minimum / 100, 2, ',', '.').' €.'
                );
            }

            AuctionBid::query()
                ->where('auction_id', $auction->id)
                ->where('status', AuctionBidStatus::Winning->value)
                ->update(['status' => AuctionBidStatus::Outbid->value]);

            $bid = AuctionBid::query()->create([
                'auction_id'   => $auction->id,
                'user_id'      => $dto->userId,
                'amount_cents' => $dto->amountCents,
                'status'       => AuctionBidStatus::Winning,
            ]);

            $auction->update([
                'current_price_cents' => $dto->amountCents,
                'bid_count'           => $auction->bid_count + 1,
                'winner_user_id'      => $dto->userId,
            ]);

            return $bid;
        });
    }
}
