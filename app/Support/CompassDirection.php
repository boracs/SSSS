<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Traduce grados (0-360) a punto cardinal de 8 rumbos. Compartido entre el
 * parte diario y la tabla de previsión multi-día para no duplicar la tabla
 * de puntos cardinales.
 */
final class CompassDirection
{
    private const POINTS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

    public static function label(?int $degrees): ?string
    {
        if ($degrees === null) {
            return null;
        }

        $index = (int) round(($degrees % 360) / 45) % 8;

        return self::POINTS[$index];
    }
}
