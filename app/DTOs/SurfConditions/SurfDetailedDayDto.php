<?php

declare(strict_types=1);

namespace App\DTOs\SurfConditions;

/**
 * Un día completo del slider "cada 2h · todos los días" (ver
 * {@see SurfDetailedSlotDto}): franjas cada 2h + resumen diario de tiempo
 * (temperatura, amanecer/atardecer) + marea, para no repetir esos datos en
 * cada una de las ~12 franjas del día.
 */
final readonly class SurfDetailedDayDto
{
    /**
     * @param  list<SurfDetailedSlotDto>  $slots
     * @param  list<SurfTideEventDto>  $tideEvents
     */
    public function __construct(
        public string $date,
        public string $dayLabel,
        public array $slots,
        public array $tideEvents,
        public ?float $tideRiseM = null,
        public ?float $tideFallM = null,
        public ?float $tempMaxC = null,
        public ?float $tempMinC = null,
        public ?string $sunrise = null,
        public ?string $sunset = null,
    ) {}
}
