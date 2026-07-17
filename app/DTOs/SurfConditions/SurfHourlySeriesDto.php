<?php

declare(strict_types=1);

namespace App\DTOs\SurfConditions;

/**
 * Series horarias crudas devueltas por Open-Meteo (oleaje + swell + viento +
 * nivel del mar) para N días, todas alineadas por índice con `times`. Sin
 * ningún cálculo de negocio — eso vive en {@see \App\Services\SurfConditions\SurfForecastTableService}.
 */
final readonly class SurfHourlySeriesDto
{
    /**
     * @param  list<string>  $times  ISO8601 local (Europe/Madrid), uno por hora.
     * @param  list<float>  $waveHeight
     * @param  list<float>  $wavePeriod
     * @param  list<int>  $waveDirection
     * @param  list<float|null>  $swellHeight
     * @param  list<float|null>  $swellPeriod
     * @param  list<int|null>  $swellDirection
     * @param  list<float>  $windSpeed
     * @param  list<int>  $windDirection
     * @param  list<float|null>  $seaLevel
     */
    public function __construct(
        public array $times,
        public array $waveHeight,
        public array $wavePeriod,
        public array $waveDirection,
        public array $swellHeight,
        public array $swellPeriod,
        public array $swellDirection,
        public array $windSpeed,
        public array $windDirection,
        public array $seaLevel,
    ) {}
}
