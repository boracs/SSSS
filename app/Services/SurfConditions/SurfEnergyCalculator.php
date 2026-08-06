<?php

declare(strict_types=1);

namespace App\Services\SurfConditions;

use App\DTOs\SurfConditions\SurfConditionsSnapshotDto;

/**
 * Energía / potencia de ola alineada con la convención Surf-Forecast / apps:
 *
 *   kJ ≈ factor × 0.5 × H_ft² × T
 *
 * con H en pies. Con factor = 2.4 y los mismos H/T que publica SF, el kJ
 * coincide en periodo corto (p. ej. 2.1 m / 6 s → 341). Ver
 * docs/surf-conditions/SURFFORECAST_CALIBRATION_DIAG.md.
 *
 * Open-Meteo en Zurriola suele devolver Hs menor que SF: se aplica
 * `energy_kj_height_scale` solo al cálculo de energía (no altera la columna
 * de altura mostrada). En periodo largo SF suma más punch → `period_boost`.
 *
 * Potencia física (kW/m) sigue siendo 0.5 × Hs_m² × T, sin calibración UI.
 */
final class SurfEnergyCalculator
{
    /** Factor de escala para que el índice interno quede en un rango ~0-10. */
    private const SCALE_FACTOR = 2.0;

    /**
     * Coeficiente de apps: P ≈ 0.5 × Hs² × Tp.
     * Coincide ~ con ρ·g²/(64π)/1000 ≈ 0.49 (Hs en metros → kW/m).
     */
    private const APP_POWER_COEFFICIENT = 0.5;

    /** Metros → pies (índice UI "kJ" de las apps). */
    private const METERS_TO_FEET = 3.28084;

    public function indexFor(SurfConditionsSnapshotDto $snapshot): float
    {
        [$height, $period] = $this->resolveHeightPeriod(
            $snapshot->waveHeightM,
            $snapshot->wavePeriodS,
            $snapshot->swellHeightM,
            $snapshot->swellPeriodS,
        );

        return $this->indexForValues($height, $period);
    }

    public function indexForValues(float $heightM, float $periodS): float
    {
        $heightM = max(0.0, $heightM);
        $periodS = max(0.0, $periodS);
        $raw = ($heightM ** 2) * $periodS;

        return round($raw * self::SCALE_FACTOR, 2);
    }

    public function labelFor(float $energyIndex): string
    {
        $bands = (array) config('services.zurriola_surf.energy_bands', []);

        foreach ($bands as $band) {
            if ($energyIndex <= (float) $band['max']) {
                return (string) $band['label'];
            }
        }

        return 'Muy fuerte';
    }

    /**
     * Potencia real en kW/m (Hs en metros): P ≈ 0.5 × Hs² × Tp.
     * Sin factor de calibración UI (física).
     */
    public function wavePowerKwPerMeter(float $heightM, float $periodS): float
    {
        $heightM = max(0.0, $heightM);
        $periodS = max(0.0, $periodS);

        return round(self::APP_POWER_COEFFICIENT * ($heightM ** 2) * $periodS, 2);
    }

    /**
     * Índice UI "kJ" alineado a Surf-Forecast:
     * round(factor × periodBoost × 0.5 × (H_m×heightScale×3.28084)² × T).
     */
    public function energyKj(float $heightM, float $periodS): int
    {
        $heightM = max(0.0, $heightM);
        $periodS = max(0.0, $periodS);

        $heightScale = max(0.0, (float) config('services.zurriola_surf.energy_kj_height_scale', 1.52));
        $factor = max(0.0, (float) config('services.zurriola_surf.energy_kj_calibration_factor', 2.4));
        $periodBoost = $this->periodBoost($periodS);

        $heightFt = $heightM * $heightScale * self::METERS_TO_FEET;
        $raw = self::APP_POWER_COEFFICIENT * ($heightFt ** 2) * $periodS;

        return (int) max(0, round($raw * $factor * $periodBoost));
    }

    /**
     * Boost SF en periodo largo (diag: 1.6 m/10 s → SF 527 vs raw×2.4 ≈ 331).
     * 1.0 si T ≤ 6 s; interpola hasta `period_boost_max` si T ≥ 10 s.
     */
    public function periodBoost(float $periodS): float
    {
        $periodS = max(0.0, $periodS);
        $boostMax = max(1.0, (float) config('services.zurriola_surf.energy_kj_period_boost_max', 1.6));
        $tShort = 6.0;
        $tLong = 10.0;

        if ($periodS <= $tShort) {
            return 1.0;
        }
        if ($periodS >= $tLong) {
            return $boostMax;
        }

        return 1.0 + ($boostMax - 1.0) * (($periodS - $tShort) / ($tLong - $tShort));
    }

    /**
     * Elige el par H/T según config `energy_kj_height_source`.
     *
     * @return array{0: float, 1: float} [heightM, periodS]
     */
    public function resolveHeightPeriod(
        float $waveHeightM,
        float $wavePeriodS,
        ?float $swellHeightM,
        ?float $swellPeriodS,
    ): array {
        $source = (string) config('services.zurriola_surf.energy_kj_height_source', 'wave');
        $hasSwell = $swellHeightM !== null && $swellPeriodS !== null;

        return match ($source) {
            'swell' => $hasSwell
                ? [(float) $swellHeightM, (float) $swellPeriodS]
                : [$waveHeightM, $wavePeriodS],
            'max_energy' => $this->pairWithHigherEnergy(
                $waveHeightM,
                $wavePeriodS,
                $hasSwell ? (float) $swellHeightM : null,
                $hasSwell ? (float) $swellPeriodS : null,
            ),
            default => [$waveHeightM, $wavePeriodS], // wave
        };
    }

    /**
     * @return array{0: float, 1: float}
     */
    private function pairWithHigherEnergy(
        float $waveHeightM,
        float $wavePeriodS,
        ?float $swellHeightM,
        ?float $swellPeriodS,
    ): array {
        if ($swellHeightM === null || $swellPeriodS === null) {
            return [$waveHeightM, $wavePeriodS];
        }

        $waveKj = $this->energyKj($waveHeightM, $wavePeriodS);
        $swellKj = $this->energyKj($swellHeightM, $swellPeriodS);

        return $swellKj > $waveKj
            ? [$swellHeightM, $swellPeriodS]
            : [$waveHeightM, $wavePeriodS];
    }
}
