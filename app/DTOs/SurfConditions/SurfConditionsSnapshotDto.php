<?php

declare(strict_types=1);

namespace App\DTOs\SurfConditions;

use Illuminate\Support\Carbon;

/**
 * Snapshot crudo de oleaje + viento en el punto de Zurriola, tal cual lo
 * devuelve {@see \App\Services\SurfConditions\OpenMeteoMarineClient}, sin
 * ningún cálculo de negocio (eso vive en SurfEnergyCalculator/SurfLevelRecommender).
 */
final readonly class SurfConditionsSnapshotDto
{
    public function __construct(
        public float $waveHeightM,
        public float $wavePeriodS,
        public int $waveDirectionDeg,
        public ?float $swellHeightM,
        public ?float $swellPeriodS,
        public ?int $swellDirectionDeg,
        public float $windSpeedKmh,
        public int $windDirectionDeg,
        public Carbon $fetchedAt,
    ) {}
}
