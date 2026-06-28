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

    public static function amountsMatchCents(?int $expectedCents, float|int|string|null $providedEuros): bool
    {
        if ($providedEuros === null) {
            return true;
        }

        return self::eurosToCents($providedEuros) === $expectedCents;
    }
}
