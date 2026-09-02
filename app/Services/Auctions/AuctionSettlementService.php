<?php

declare(strict_types=1);

namespace App\Services\Auctions;

use App\Contracts\Payments\FindsOpenCheckout;
use App\Contracts\Payments\StartsCheckout;
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
        private readonly StartsCheckout $initiatePayment,
        private readonly FindsOpenCheckout $openCheckout,
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
                    'status'               => AuctionStatus::Ended,
                    'winner_user_id'       => null,
                    'payment_status'       => null,
                    'payment_deadline_at'  => null,
                ]);

                return true;
            }

            $locked->update([
                'status'              => AuctionStatus::Ended,
                'payment_status'      => PaymentStatus::Pending,
                'payment_deadline_at' => now()->addMinutes($this->paymentGraceMinutes()),
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
            'status'              => AuctionStatus::Cancelled,
            'payment_status'      => null,
            'payment_deadline_at' => null,
        ]);
    }

    /**
     * Cobro del ganador serializado por la fila de la subasta: dos clics no
     * pueden abrir dos sesiones Stripe del mismo lote. El lock cubre también la
     * apertura de sesión; soltarlo antes deja la ventana del doble cargo.
     */
    public function initiateWinnerPayment(Auction $auction, int $userId): string
    {
        return DB::transaction(function () use ($auction, $userId): string {
            $locked = Auction::query()->whereKey($auction->id)->lockForUpdate()->first();

            if ($locked === null) {
                throw new RuntimeException('La subasta ya no está disponible.');
            }

            if ($locked->status !== AuctionStatus::Ended) {
                throw new RuntimeException('La subasta aún no está lista para cobro.');
            }

            if ((int) $locked->winner_user_id !== $userId) {
                throw new RuntimeException('No eres el ganador de esta subasta.');
            }

            if ($locked->payment_status === PaymentStatus::Confirmed) {
                throw new RuntimeException('Esta subasta ya está pagada.');
            }

            if ($locked->payment_status !== PaymentStatus::Pending) {
                throw new RuntimeException('No hay pago pendiente para esta subasta.');
            }

            if ($locked->paymentDeadlineHasPassed()) {
                throw new RuntimeException('El plazo para pagar esta subasta ha caducado.');
            }

            $openUrl = $this->openCheckout->openCheckoutUrlFor(Auction::class, (int) $locked->id);
            if ($openUrl !== null) {
                return $openUrl;
            }

            $dto = new InitiatePaymentDto(
                payableType: Auction::class,
                payableId: (int) $locked->id,
                lineItems: [
                    new PaymentLineItemDto(
                        name: 'Subasta: '.$locked->title,
                        description: 'Adjudicación subasta S4 #'.$locked->id,
                        unitAmountCents: (int) $locked->current_price_cents,
                        quantity: 1,
                    ),
                ],
                successPath: '/subastas/'.$locked->slug,
                cancelPath: '/subastas/'.$locked->slug,
                customerEmail: auth()->user()?->email,
                metadata: [
                    'auction_id' => (string) $locked->id,
                    'auction_slug' => $locked->slug,
                ],
            );

            return $this->initiatePayment->execute($dto);
        });
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

            if ($auction->status !== AuctionStatus::Ended
                || $auction->payment_status !== PaymentStatus::Pending
                || $auction->winner_user_id === null
            ) {
                return false;
            }

            $auction->update([
                'status'              => AuctionStatus::Settled,
                'payment_status'      => PaymentStatus::Confirmed,
                'settled_at'          => now(),
                'payment_deadline_at' => null,
            ]);

            return true;
        });
    }

    /**
     * Subastas Ended + Pending cuyo plazo de pago ya pasó: quedan Ended sin
     * ganador para poder re-publicarlas o cerrarlas. Una fila por transacción
     * con lockForUpdate, igual que el resto de barridos de dinero.
     */
    public function expireUnpaidAuctions(): int
    {
        $ids = Auction::query()
            ->where('status', AuctionStatus::Ended->value)
            ->where('payment_status', PaymentStatus::Pending->value)
            ->whereNotNull('payment_deadline_at')
            ->where('payment_deadline_at', '<=', now())
            ->orderBy('id')
            ->pluck('id');

        $expired = 0;

        foreach ($ids as $id) {
            $expired += (int) DB::transaction(function () use ($id): int {
                $locked = Auction::query()->whereKey($id)->lockForUpdate()->first();

                if ($locked === null) {
                    return 0;
                }

                if ($locked->status !== AuctionStatus::Ended
                    || $locked->payment_status !== PaymentStatus::Pending
                    || $locked->payment_deadline_at === null
                    || $locked->payment_deadline_at->gt(now())
                ) {
                    return 0;
                }

                $locked->update([
                    'status'              => AuctionStatus::Ended,
                    'winner_user_id'      => null,
                    'payment_status'      => null,
                    'payment_deadline_at' => null,
                ]);

                return 1;
            });
        }

        return $expired;
    }

    private function paymentGraceMinutes(): int
    {
        return max(1, (int) config('auctions.payment_grace_minutes', 1440));
    }
}
