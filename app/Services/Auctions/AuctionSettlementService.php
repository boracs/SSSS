<?php

declare(strict_types=1);

namespace App\Services\Auctions;

use App\Actions\Payments\InitiatePaymentAction;
use App\DTOs\Payments\InitiatePaymentDto;
use App\DTOs\Payments\PaymentLineItemDto;
use App\Enums\AuctionStatus;
use App\Enums\PaymentStatus;
use App\Models\Auction;
use Illuminate\Support\Facades\DB;
use RuntimeException;

final class AuctionSettlementService
{
    public function __construct(
        private readonly InitiatePaymentAction $initiatePayment,
    ) {}

    public function closeAuction(Auction $auction): bool
    {
        return DB::transaction(function () use ($auction): bool {
            $locked = Auction::query()->whereKey($auction->id)->lockForUpdate()->first();

            if ($locked === null || $locked->status !== AuctionStatus::Live) {
                return false;
            }

            if ($locked->bid_count === 0 || ! $locked->reserveMet()) {
                $locked->update([
                    'status'          => AuctionStatus::Ended,
                    'winner_user_id'  => null,
                    'payment_status'  => null,
                ]);

                return true;
            }

            $locked->update([
                'status'         => AuctionStatus::Ended,
                'payment_status' => PaymentStatus::Pending,
            ]);

            return true;
        });
    }

    public function publish(Auction $auction): void
    {
        if ($auction->status !== AuctionStatus::Draft) {
            throw new RuntimeException('Solo se pueden publicar subastas en borrador.');
        }

        $auction->update([
            'status'    => AuctionStatus::Live,
            'starts_at' => $auction->starts_at ?? now(),
            'ends_at'   => $auction->ends_at ?? now()->addDays(7),
        ]);
    }

    public function cancel(Auction $auction): void
    {
        if (in_array($auction->status, [AuctionStatus::Settled, AuctionStatus::Cancelled], true)) {
            throw new RuntimeException('No se puede cancelar esta subasta.');
        }

        $auction->update([
            'status'         => AuctionStatus::Cancelled,
            'payment_status' => null,
        ]);
    }

    public function initiateWinnerPayment(Auction $auction, int $userId): string
    {
        if ($auction->status !== AuctionStatus::Ended) {
            throw new RuntimeException('La subasta aún no está lista para cobro.');
        }

        if ((int) $auction->winner_user_id !== $userId) {
            throw new RuntimeException('No eres el ganador de esta subasta.');
        }

        if ($auction->payment_status === PaymentStatus::Confirmed) {
            throw new RuntimeException('Esta subasta ya está pagada.');
        }

        if ($auction->payment_status !== PaymentStatus::Pending) {
            throw new RuntimeException('No hay pago pendiente para esta subasta.');
        }

        $dto = new InitiatePaymentDto(
            payableType: Auction::class,
            payableId: (int) $auction->id,
            lineItems: [
                new PaymentLineItemDto(
                    name: 'Subasta: '.$auction->title,
                    description: 'Adjudicación subasta S4 #'.$auction->id,
                    unitAmountCents: (int) $auction->current_price_cents,
                    quantity: 1,
                ),
            ],
            successPath: '/subastas/'.$auction->slug,
            cancelPath: '/subastas/'.$auction->slug,
            customerEmail: auth()->user()?->email,
            metadata: [
                'auction_id' => (string) $auction->id,
                'auction_slug' => $auction->slug,
            ],
        );

        return $this->initiatePayment->execute($dto);
    }

    public function confirmPayment(int $auctionId): bool
    {
        return DB::transaction(function () use ($auctionId): bool {
            $auction = Auction::query()->whereKey($auctionId)->lockForUpdate()->first();

            if ($auction === null) {
                return false;
            }

            if ($auction->payment_status === PaymentStatus::Confirmed) {
                return true;
            }

            $auction->update([
                'status'         => AuctionStatus::Settled,
                'payment_status' => PaymentStatus::Confirmed,
                'settled_at'     => now(),
            ]);

            return true;
        });
    }
}
