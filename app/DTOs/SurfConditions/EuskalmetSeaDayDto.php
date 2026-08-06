<?php

declare(strict_types=1);

namespace App\DTOs\SurfConditions;

/**
 * Día de predicción marítima Euskalmet (XML sea_forecast): mareas oficiales
 * + resumen cualitativo. Oleaje/viento horario de la tabla sigue en Open-Meteo.
 *
 * @param  list<SurfTideEventDto>  $tideEvents
 */
final readonly class EuskalmetSeaDayDto
{
    public function __construct(
        public string $date,
        public array $tideEvents,
        public ?float $tideRiseM,
        public ?float $tideFallM,
        public ?float $waveHeightM,
        public ?string $forecastTextEs,
        public ?string $waterTemperature,
        public ?string $visibility,
    ) {}
}
