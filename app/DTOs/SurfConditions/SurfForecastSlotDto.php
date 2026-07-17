<?php

declare(strict_types=1);

namespace App\DTOs\SurfConditions;

/**
 * Una franja horaria de la tabla de previsión (ej. "12:00" del sábado).
 */
final readonly class SurfForecastSlotDto
{
    public function __construct(
        public string $time,
        public string $hourLabel,
        public float $waveHeightM,
        public float $wavePeriodS,
        public int $waveDirectionDeg,
        public ?float $swellHeightM,
        public ?float $swellPeriodS,
        public ?int $swellDirectionDeg,
        public float $windSpeedKmh,
        public int $windDirectionDeg,
        public float $energyIndex,
        public string $energyLabel,
        public int $energyKj,
        public string $windState,
    ) {}
}
