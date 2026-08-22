<?php

declare(strict_types=1);

namespace App\DTOs\SurfConditions;

/**
 * Una franja de 2h del slider "cada 2h · todos los días": fusiona oleaje/viento
 * (Open-Meteo marine) con tiempo atmosférico (Open-Meteo weather), ambos ya
 * calculados por {@see \App\Services\SurfConditions\SurfForecastTableService::detailedPayload()}.
 *
 * `weatherCode`/`tempC`/`precipProbabilityPct` son nulos si el tiempo
 * atmosférico no está disponible para esa franja (Open-Meteo caído, flag
 * desactivada...): el oleaje se sigue mostrando igual, nunca se inventa tiempo.
 *
 * Estrellas por nivel (1–5): {@see \App\Services\SurfConditions\SurfLevelQualityStarsService}
 * (JSON del spot). `qualityStars` = intermedio (compat).
 */
final readonly class SurfDetailedSlotDto
{
    public function __construct(
        public string $time,
        public string $hourLabel,
        public float $waveHeightM,
        public float $wavePeriodS,
        public int $waveDirectionDeg,
        public float $windSpeedKmh,
        public int $windDirectionDeg,
        public float $energyIndex,
        public string $energyLabel,
        public int $energyKj,
        public string $windState,
        /** Señal 4 colores (good|espigon|caution|closed), misma escala que el resto de la tabla. */
        public string $signal,
        /** Compat: mismo valor que {@see $qualityStarsIntermedio}. */
        public int $qualityStars,
        public int $qualityStarsIniciacion,
        public int $qualityStarsIntermedio,
        public int $qualityStarsAvanzado,
        public ?int $weatherCode = null,
        public ?float $tempC = null,
        public ?int $precipProbabilityPct = null,
    ) {}
}
