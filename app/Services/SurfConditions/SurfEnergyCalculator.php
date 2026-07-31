<?php

declare(strict_types=1);

namespace App\Services\SurfConditions;

use App\DTOs\SurfConditions\SurfConditionsSnapshotDto;

/**
 * Energía / potencia de ola para surf (convención de apps de previsión):
 *
 *   P ≈ 0.5 × Hs² × Tp     [kW/m]  (= kJ/s por metro de frente)
 *
 * con Hs en **metros**. Es la aproximación práctica de la potencia Airy
 * (ρg²Hs²Tp/(64π) ≈ 0.49·Hs²·Tp) que usan Surfline / Surf-Forecast.
 *
 * El número entero de UI ({@see self::energyKj}), etiquetado "kJ" como en las
 * apps, indexa la misma forma pero con Hs en **pies**, multiplicado por
 * {@see config('services.zurriola_surf.energy_kj_calibration_factor')} (~2.4)
 * para acercar el orden de magnitud a la convención tipo Surf-Forecast en
 * periodo corto (ver docs/surf-conditions/SURFFORECAST_CALIBRATION_DIAG.md).
 * No es un dato oficial de Surf-Forecast: fuente de oleaje = Open-Meteo.
 *
 * Además: índice verbal interno S4 ({@see self::indexForValues}).
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
     * Índice UI "kJ" (convención tipo apps / SF): 0.5 × H_ft² × T × calibration_factor.
     */
    public function energyKj(float $heightM, float $periodS): int
    {
        $heightM = max(0.0, $heightM);
        $periodS = max(0.0, $periodS);
        $heightFt = $heightM * self::METERS_TO_FEET;
        $factor = max(0.0, (float) config('services.zurriola_surf.energy_kj_calibration_factor', 2.4));
        $raw = self::APP_POWER_COEFFICIENT * ($heightFt ** 2) * $periodS;

        return (int) max(0, round($raw * $factor));
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
