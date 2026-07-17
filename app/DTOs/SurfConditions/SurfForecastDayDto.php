<?php

declare(strict_types=1);

namespace App\DTOs\SurfConditions;

/**
 * Un día completo de la tabla de previsión: franjas horarias visibles
 * (06h-21h), eventos de marea (típicamente 2 altas + 2 bajas) y
 * coeficientes de subida/bajada del día.
 */
final readonly class SurfForecastDayDto
{
    /**
     * @param  list<SurfForecastSlotDto>  $slots
     * @param  list<SurfTideEventDto>  $tideEvents
     */
    public function __construct(
        public string $date,
        public string $dayLabel,
        public array $slots,
        public array $tideEvents,
        public ?float $tideRiseM = null,
        public ?float $tideFallM = null,
    ) {}
}
