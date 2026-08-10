<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\BookingService;
use Illuminate\Console\Command;

/**
 * Cancela reservas de alquiler cuyo checkout Stripe se abandonó (expires_at).
 * Sin cobro (ni el depósito del 30 %) la reserva no debe bloquear inventario.
 */
final class ExpirePendingRentalBookingsCommand extends Command
{
    protected $signature = 'rentals:expire-pending-unpaid';

    protected $description = 'Cancela alquileres pendientes cuyo pago online no se completó a tiempo';

    public function handle(BookingService $bookings): int
    {
        $expired = $bookings->autoExpirePending();
        $this->info('Reservas de alquiler pendientes caducadas: '.$expired->count());

        return self::SUCCESS;
    }
}
