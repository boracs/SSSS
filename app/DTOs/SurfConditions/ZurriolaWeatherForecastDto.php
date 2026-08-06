<?php

declare(strict_types=1);

namespace App\DTOs\SurfConditions;

/**
 * Payload completo del panel "Tiempo detallado" (horario + 7 días) que
 * construye {@see \App\Services\SurfConditions\OpenMeteoWeatherClient}.
 * Cacheado 45 min por {@see \App\Services\SurfConditions\ZurriolaWeatherForecastService}.
 *
 * @param  list<ZurriolaWeatherHourDto>  $hourly
 * @param  list<ZurriolaWeatherDayDto>  $daily
 */
final readonly class ZurriolaWeatherForecastDto
{
    public function __construct(
        public string $fetchedAt,
        public array $hourly,
        public array $daily,
    ) {}

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'fetched_at' => $this->fetchedAt,
            'hourly' => array_map(static fn (ZurriolaWeatherHourDto $hour): array => $hour->toArray(), $this->hourly),
            'daily' => array_map(static fn (ZurriolaWeatherDayDto $day): array => $day->toArray(), $this->daily),
        ];
    }
}
