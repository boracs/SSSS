<?php

declare(strict_types=1);

namespace App\Services\Store;

use App\Support\MoneyCents;

/**
 * Precio de socio de tienda: descuento sobre catálogo, siempre en céntimos.
 */
final class StoreProductPricing
{
    public static function unitPriceCents(float|int|string $precioEuros, float|int|string $descuentoPercent): int
    {
        $baseCents = MoneyCents::eurosToCents($precioEuros);
        $descuento = max(0, min(100, (int) round((float) $descuentoPercent)));

        if ($descuento === 0) {
            return $baseCents;
        }

        return (int) round($baseCents * (100 - $descuento) / 100);
    }

    public static function lineTotalCents(
        float|int|string $precioEuros,
        float|int|string $descuentoPercent,
        int $quantity,
    ): int {
        $qty = max(0, $quantity);

        return self::unitPriceCents($precioEuros, $descuentoPercent) * $qty;
    }

    public static function unitPriceEuros(float|int|string $precioEuros, float|int|string $descuentoPercent): float
    {
        return MoneyCents::centsToEuros(self::unitPriceCents($precioEuros, $descuentoPercent));
    }

    public static function catalogEuros(float|int|string $precioEuros): float
    {
        return MoneyCents::centsToEuros(MoneyCents::eurosToCents($precioEuros));
    }
}
