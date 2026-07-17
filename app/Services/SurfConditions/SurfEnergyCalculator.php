<?php

declare(strict_types=1);

namespace App\Services\SurfConditions;

use App\DTOs\SurfConditions\SurfConditionsSnapshotDto;

/**
 * Energía de ola para surf:
 *
 * 1) Índice interno verbal ({@see self::indexForValues}) — escala propia S4.
 * 2) Potencia física kW/m ({@see self::wavePowerKwPerMeter}) — teoría de Airy
 *    en aguas profundas con altura significativa Hs:
 *    P = (ρ · g² · Hs² · Tp) / (64π)  [W/m], ρ=1025, g=9.81.
 * 3) Energía en kJ estilo previsión de surf ({@see self::energyKj}) — convención
 *    del sector (Surf-Forecast / Surfline): Hs² × Tp con Hs en pies. Prefiere
 *    swell (mar de fondo) sobre ola combinada porque es la energía que llega
 *    al spot, no el chop local. Encaja con los umbrales de
 *    `zurriola-spot-logistics.json` (`energy_kj`).
 */
final class SurfEnergyCalculator
{
    /** Factor de escala para que el índice interno quede en un rango ~0-10. */
    private const SCALE_FACTOR = 2.0;

    /** Densidad del agua de mar (kg/m³). */
    private const SEA_WATER_DENSITY = 1025.0;

    /** Gravedad (m/s²). */
    private const GRAVITY = 9.81;

    /** Metros → pies (para la convención kJ del sector). */
    private const METERS_TO_FEET = 3.28084;

    public function indexFor(SurfConditionsSnapshotDto $snapshot): float
    {
        $height = $snapshot->swellHeightM ?? $snapshot->waveHeightM;
        $period = $snapshot->swellPeriodS ?? $snapshot->wavePeriodS;

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
     * Potencia de ola (kW por metro de cresta). Fórmula de aguas profundas
     * con altura significativa Hs (NO Hrms): divisor 64π.
     */
    public function wavePowerKwPerMeter(float $heightM, float $periodS): float
    {
        $heightM = max(0.0, $heightM);
        $periodS = max(0.0, $periodS);

        $watts = (self::SEA_WATER_DENSITY * (self::GRAVITY ** 2) * ($heightM ** 2) * $periodS) / (64 * M_PI);

        return round($watts / 1000, 2);
    }

    /**
     * Energía en kJ para la UI / umbrales del JSON de logística.
     *
     * Convención oceanográfica de previsión de surf:
     *   E(kJ) = (Hs_pies)² × Tp
     * con Hs preferentemente del swell (altura de mar de fondo) y Tp su periodo.
     * Es la misma relación H²×T de la potencia de ola, expresada en la escala
     * que usan los partes de surf (no es un kJ SI de laboratorio).
     */
    public function energyKj(float $heightM, float $periodS): int
    {
        $heightM = max(0.0, $heightM);
        $periodS = max(0.0, $periodS);
        $heightFt = $heightM * self::METERS_TO_FEET;

        return (int) max(0, round(($heightFt ** 2) * $periodS));
    }
}
