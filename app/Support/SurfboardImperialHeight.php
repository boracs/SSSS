<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Convierte altura decimal en pies (p. ej. 5.83) a notación de tablas 5'10".
 */
final class SurfboardImperialHeight
{
    public static function label(?float $feetDecimal): ?string
    {
        if ($feetDecimal === null || ! is_finite($feetDecimal) || $feetDecimal < 0) {
            return null;
        }

        $totalInches = (int) round($feetDecimal * 12);
        $feet = intdiv($totalInches, 12);
        $inches = $totalInches % 12;

        return sprintf("%d'%d\"", $feet, $inches);
    }
}
