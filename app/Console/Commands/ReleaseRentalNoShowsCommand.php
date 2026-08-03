<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\BookingService;
use Illuminate\Console\Command;

/**
 * Devuelve al inventario las tablas de reservas no recogidas dentro del margen
 * de cortesía. Programado en routes/console.php.
 */
class ReleaseRentalNoShowsCommand extends Command
{
    protected $signature = 'rentals:release-no-shows {--dry-run : Solo listar las reservas afectadas}';

    protected $description = 'Libera tablas de alquiler no recogidas (no-show) pasado el margen de cortesía';

    public function handle(BookingService $bookingService): int
    {
        $grace = $bookingService->noShowGraceMinutes();

        if ($this->option('dry-run')) {
            $candidates = $bookingService->noShowCandidates();
            $protected = $bookingService->noShowProtectedByPayment();

            $this->info("Modo simulación · margen {$grace} min · a liberar: {$candidates->count()} · protegidas por pago completo: {$protected->count()}");

            foreach ($candidates as $booking) {
                $this->line(sprintf(
                    '  liberar  #%d · tabla %d · recogida %s · %s · pagado %s de %s €',
                    $booking->id,
                    $booking->surfboard_id,
                    $booking->pickup_at?->format('d/m/Y H:i') ?? '—',
                    $booking->client_name,
                    $booking->deposit_amount,
                    $booking->total_price,
                ));
            }

            foreach ($protected as $booking) {
                $this->line(sprintf(
                    '  conservar #%d · tabla %d · recogida %s · alquiler pagado entero',
                    $booking->id,
                    $booking->surfboard_id,
                    $booking->pickup_at?->format('d/m/Y H:i') ?? '—',
                ));
            }

            return self::SUCCESS;
        }

        if (! $bookingService->isNoShowSweepEnabled()) {
            $this->warn('Barrido de no-shows desactivado (rentals.no_show_release_enabled). Usa --dry-run para revisar candidatas.');

            return self::SUCCESS;
        }

        $released = $bookingService->releaseNoShows();

        $this->info("No-shows liberados: {$released->count()} (margen {$grace} min).");

        return self::SUCCESS;
    }
}
