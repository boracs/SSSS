<?php

declare(strict_types=1);

namespace App\Services\SurfConditions;

use App\DTOs\SurfConditions\SurfConditionsSnapshotDto;
use App\DTOs\SurfConditions\SurfLevelStarsDto;
use App\Models\SurfDailyBrief;

/**
 * Traduce el snapshot a:
 * - nivel Gemini (iniciacion/intermedio/avanzado/no_recomendado)
 * - señal visual de 4 colores (good/espigon/caution/closed) para el badge UI
 *
 * ⚠️ Umbrales de config son borrador — pendientes de validar con la escuela.
 */
final class SurfLevelRecommender
{
    public const LEVEL_INICIACION = 'iniciacion';

    public const LEVEL_INTERMEDIO = 'intermedio';

    public const LEVEL_AVANZADO = 'avanzado';

    public const LEVEL_NO_RECOMENDADO = 'no_recomendado';

    private const LEVEL_ORDER = [self::LEVEL_INICIACION, self::LEVEL_INTERMEDIO, self::LEVEL_AVANZADO];

    private const SIGNAL_ORDER = [
        SurfDailyBrief::OVERRIDE_GOOD,
        SurfDailyBrief::OVERRIDE_ESPIGON,
        SurfDailyBrief::OVERRIDE_CAUTION,
    ];

    public function recommend(SurfConditionsSnapshotDto $snapshot): string
    {
        return $this->firstMatchingLevel(
            $snapshot,
            self::LEVEL_ORDER,
            (array) config('services.zurriola_surf.level_thresholds', []),
            self::LEVEL_NO_RECOMENDADO,
        );
    }

    /**
     * Señal automática de 4 colores para el badge público.
     * El admin puede sobrescribirla (admin_override_status).
     */
    public function recommendSignal(SurfConditionsSnapshotDto $snapshot): string
    {
        return $this->firstMatchingLevel(
            $snapshot,
            self::SIGNAL_ORDER,
            (array) config('services.zurriola_surf.signal_thresholds', []),
            SurfDailyBrief::OVERRIDE_CLOSED,
        );
    }

    public function autoSignalFromBrief(SurfDailyBrief $brief): string
    {
        if ($brief->wave_height_m === null || $brief->wind_speed_kmh === null) {
            return $this->signalFromLegacyLevel($brief->level_recommendation);
        }

        $snapshot = new SurfConditionsSnapshotDto(
            waveHeightM: (float) $brief->wave_height_m,
            wavePeriodS: (float) ($brief->wave_period_s ?? 0),
            waveDirectionDeg: (int) ($brief->wave_direction_deg ?? 0),
            swellHeightM: $brief->swell_height_m !== null ? (float) $brief->swell_height_m : null,
            swellPeriodS: $brief->swell_period_s !== null ? (float) $brief->swell_period_s : null,
            swellDirectionDeg: $brief->swell_direction_deg !== null ? (int) $brief->swell_direction_deg : null,
            windSpeedKmh: (float) $brief->wind_speed_kmh,
            windDirectionDeg: (int) ($brief->wind_direction_deg ?? 0),
            fetchedAt: $brief->fetched_at ?? now(),
        );

        return $this->recommendSignal($snapshot);
    }

    /** Fallback si el brief aún no tiene olas/viento (p. ej. pending). */
    public function signalFromLegacyLevel(?string $level): string
    {
        return match ($level) {
            self::LEVEL_INICIACION => SurfDailyBrief::OVERRIDE_GOOD,
            self::LEVEL_INTERMEDIO => SurfDailyBrief::OVERRIDE_CAUTION,
            self::LEVEL_AVANZADO => SurfDailyBrief::OVERRIDE_CLOSED,
            default => SurfDailyBrief::OVERRIDE_CLOSED,
        };
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

    /**
     * @param  list<string>  $order
     * @param  array<string, array<string, mixed>>  $thresholds
     */
    private function firstMatchingLevel(
        SurfConditionsSnapshotDto $snapshot,
        array $order,
        array $thresholds,
        string $fallback,
    ): string {
        $isOffshore = $this->isOffshoreWind($snapshot->windDirectionDeg);

        foreach ($order as $level) {
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

        return $fallback;
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

    /**
     * Titular del parte: el nivel para el que el día “es” según las estrellas
     * (mismo recetario JSON). Empate iniciación/intermedio → intermedio (mayoría del alumnado).
     */
    public function headlineFromStars(SurfLevelStarsDto $stars): string
    {
        $max = max($stars->iniciacion, $stars->intermedio, $stars->avanzado);
        if ($max <= 1) {
            return self::LEVEL_NO_RECOMENDADO;
        }

        if ($stars->avanzado === $max && $stars->avanzado > $stars->intermedio && $stars->avanzado > $stars->iniciacion) {
            return self::LEVEL_AVANZADO;
        }

        if ($stars->intermedio === $max) {
            return self::LEVEL_INTERMEDIO;
        }

        return self::LEVEL_INICIACION;
    }
}
