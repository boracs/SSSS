<?php

declare(strict_types=1);

namespace App\DTOs\SurfConditions;

/**
 * Una franja horaria del tiempo atmosférico detallado (Open-Meteo forecast).
 * Distinto de {@see SurfForecastSlotDto} (oleaje/viento de la tabla marina):
 * este DTO alimenta el panel "Tiempo detallado" bajo demanda en webcams.
 */
final readonly class ZurriolaWeatherHourDto
{
    public function __construct(
        public string $time,
        public float $temperatureC,
        public int $precipProbabilityPct,
        public int $cloudCoverPct,
        public float $windSpeedKmh,
        public int $windDirectionDeg,
        public float $windGustsKmh,
        public int $uvIndex,
        public int $weatherCode,
    ) {}

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'time' => $this->time,
            'temperature_c' => $this->temperatureC,
            'precip_probability_pct' => $this->precipProbabilityPct,
            'cloud_cover_pct' => $this->cloudCoverPct,
            'wind_speed_kmh' => $this->windSpeedKmh,
            'wind_direction_deg' => $this->windDirectionDeg,
            'wind_gusts_kmh' => $this->windGustsKmh,
            'uv_index' => $this->uvIndex,
            'weather_code' => $this->weatherCode,
        ];
    }
}
