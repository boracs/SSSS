<?php

declare(strict_types=1);

namespace Tests\Unit\Rentals;

use App\Exceptions\TransactionRequiredException;
use App\Services\BookingService;
use App\Support\BusinessDateTime;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Anti-overbooking: la comprobación de solape solo vale con lockForUpdate, o
 * sea, dentro de una transacción. Este contrato se prueba aquí (sin
 * RefreshDatabase) porque los tests Feature ya corren dentro de una.
 */
class RentalAvailabilityGuardTest extends TestCase
{
    #[Test]
    public function is_available_fuera_de_transaccion_falla(): void
    {
        $this->expectException(TransactionRequiredException::class);

        app(BookingService::class)->isAvailable(
            1,
            BusinessDateTime::parseInAppTimezone('2026-08-10 10:00:00'),
            BusinessDateTime::parseInAppTimezone('2026-08-10 12:30:00'),
        );
    }

    #[Test]
    public function is_window_available_arrastra_la_misma_guarda(): void
    {
        config([
            'services.academy.business_timezone' => 'Europe/Madrid',
            'rentals.pickup_window_start' => '09:00',
            'rentals.pickup_window_end' => '19:00',
        ]);

        $service = app(BookingService::class);
        $window = $service->normalizeHourWindow(
            BusinessDateTime::parseInAppTimezone('2026-08-10 10:00:00'),
            120,
        );

        $this->expectException(TransactionRequiredException::class);

        $service->isWindowAvailable(1, $window);
    }
}
