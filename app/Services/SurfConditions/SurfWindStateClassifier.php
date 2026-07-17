<?php

declare(strict_types=1);

namespace App\Services\SurfConditions;

/**
 * Clasifica el viento en los 5 estados estándar de previsión de surf
 * (glassy/off/cross-off/cross-on/on), igual que Surfforecast/Windguru.
 *
 * "off"/"on" se miden como distancia angular al centro offshore configurado
 * (`zurriola_surf.offshore_wind_center_deg`); el cuarteo 45/90/135° es la
 * convención estándar del sector, no un dato de negocio. El umbral de
 * "glassy" (viento flojo, da igual la dirección) sí es config porque
 * depende de cuánto abrigo tiene el spot.
 */
final class SurfWindStateClassifier
{
    public const GLASSY = 'glassy';

    public const OFFSHORE = 'off';

    public const CROSS_OFFSHORE = 'cross-off';

    public const CROSS_ONSHORE = 'cross-on';

    public const ONSHORE = 'on';

    public function classify(float $windSpeedKmh, int $windDirectionDeg): string
    {
        $glassyMax = (float) config('services.zurriola_surf.wind_glassy_max_kmh', 8);

        if ($windSpeedKmh <= $glassyMax) {
            return self::GLASSY;
        }

        $center = (float) config('services.zurriola_surf.offshore_wind_center_deg', 180);
        $diff = abs($this->angleDiff((float) $windDirectionDeg, $center));

        return match (true) {
            $diff <= 45.0 => self::OFFSHORE,
            $diff <= 90.0 => self::CROSS_OFFSHORE,
            $diff <= 135.0 => self::CROSS_ONSHORE,
            default => self::ONSHORE,
        };
    }

    public function label(string $state): string
    {
        return match ($state) {
            self::GLASSY => 'Sin viento (glassy)',
            self::OFFSHORE => 'Offshore (mar limpio)',
            self::CROSS_OFFSHORE => 'Cross-off',
            self::CROSS_ONSHORE => 'Cross-on',
            self::ONSHORE => 'Onshore (mar picado)',
            default => $state,
        };
    }

    private function angleDiff(float $a, float $b): float
    {
        return fmod(($a - $b + 180 + 360), 360) - 180;
    }
}
