<?php

declare(strict_types=1);

namespace App\DTOs\SurfConditions;

/**
 * Un día del resumen diario (7 días) del panel "Tiempo detallado".
 * `sunrise`/`sunset` llegan en hora local (timezone `zurriola_surf`), tal
 * cual los formatea Open-Meteo (sin conversión adicional en el front).
 */
final readonly class ZurriolaWeatherDayDto
{
    public function __construct(
        public string $date,
        public float $tempMaxC,
        public float $tempMinC,
        public int $precipProbabilityMaxPct,
        public string $sunrise,
        public string $sunset,
        public int $weatherCode,
    ) {}

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'date' => $this->date,
            'temp_max_c' => $this->tempMaxC,
            'temp_min_c' => $this->tempMinC,
            'precip_probability_max_pct' => $this->precipProbabilityMaxPct,
            'sunrise' => $this->sunrise,
            'sunset' => $this->sunset,
            'weather_code' => $this->weatherCode,
        ];
    }
}
