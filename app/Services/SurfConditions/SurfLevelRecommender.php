<?php

declare(strict_types=1);

namespace App\Services\SurfConditions;

use App\DTOs\SurfConditions\SurfConditionsSnapshotDto;

/**
 * Traduce el snapshot a una recomendación de nivel (iniciacion/intermedio/
 * avanzado/no_recomendado) usando umbrales 100% en config — es una señal
 * RÁPIDA para el badge de la UI; el matiz real lo da el texto de Gemini
 * (que usa la guía completa del spot, no solo estos umbrales).
 *
 * ⚠️ Umbrales de `config('services.zurriola_surf.level_thresholds')` son un
 * borrador de partida (entorno de prueba) — pendientes de validar con el
 * equipo de la escuela antes de tratarlos como criterio oficial.
 */
final class SurfLevelRecommender
{
    public const LEVEL_INICIACION = 'iniciacion';

    public const LEVEL_INTERMEDIO = 'intermedio';

    public const LEVEL_AVANZADO = 'avanzado';

    public const LEVEL_NO_RECOMENDADO = 'no_recomendado';

    private const ORDER = [self::LEVEL_INICIACION, self::LEVEL_INTERMEDIO, self::LEVEL_AVANZADO];

    public function recommend(SurfConditionsSnapshotDto $snapshot): string
    {
        $thresholds = (array) config('services.zurriola_surf.level_thresholds', []);
        $isOffshore = $this->isOffshoreWind($snapshot->windDirectionDeg);

        foreach (self::ORDER as $level) {
            $rule = $thresholds[$level] ?? null;
            if ($rule === null) {
                continue;
            }

            $maxWave = (float) ($rule['max_wave_height_m'] ?? PHP_FLOAT_MAX);
            $maxWind = (float) ($isOffshore ? ($rule['max_wind_kmh_offshore'] ?? PHP_FLOAT_MAX) : ($rule['max_wind_kmh_onshore'] ?? PHP_FLOAT_MAX));

            if ($snapshot->waveHeightM <= $maxWave && $snapshot->windSpeedKmh <= $maxWind) {
                return $level;
            }
        }

        return self::LEVEL_NO_RECOMENDADO;
    }

    public function isOffshoreWind(int $windDirectionDeg): bool
    {
        $center = (float) config('services.zurriola_surf.offshore_wind_center_deg', 180);
        $arc = (float) config('services.zurriola_surf.offshore_wind_arc_deg', 90);

        $diff = abs($this->angleDiff($windDirectionDeg, $center));

        return $diff <= ($arc / 2);
    }

    private function angleDiff(float $a, float $b): float
    {
        $diff = fmod(($a - $b + 180 + 360), 360) - 180;

        return $diff;
    }

    public function label(string $level): string
    {
        return match ($level) {
            self::LEVEL_INICIACION => 'Bueno para iniciación',
            self::LEVEL_INTERMEDIO => 'Bueno para nivel intermedio',
            self::LEVEL_AVANZADO => 'Solo nivel avanzado',
            default => 'No recomendable hoy',
        };
    }
}
