<?php

declare(strict_types=1);

namespace App\Support;

final class MoneyCents
{
    public static function eurosToCents(float|int|string $euros): int
    {
        return (int) round(((float) $euros) * 100);
    }

    public static function centsToEuros(int $cents): float
    {
        return round($cents / 100, 2);
    }

    /**
     * Base imponible en céntimos a partir de un total con IVA incluido.
     * Usado al emitir a B2BRouter (su `price` es neto, sin IVA).
     */
    public static function netFromGrossInclusiveVat(int $grossCents, float $vatPercent): int
    {
        if ($grossCents < 0) {
            throw new \InvalidArgumentException('grossCents no puede ser negativo.');
        }

        if ($vatPercent < 0) {
            throw new \InvalidArgumentException('vatPercent no puede ser negativo.');
        }

        if ($vatPercent == 0.0) {
            return $grossCents;
        }

        return (int) round($grossCents / (1 + ($vatPercent / 100)));
    }

    public static function amountsMatchCents(?int $expectedCents, float|int|string|null $providedEuros): bool
    {
        if ($providedEuros === null) {
            return true;
        }

        return self::eurosToCents($providedEuros) === $expectedCents;
    }

    public static function formatEurosLabel(int $cents): string
    {
        $safe = max(0, $cents);

        return sprintf('%d,%02d €', intdiv($safe, 100), $safe % 100);
    }
}
