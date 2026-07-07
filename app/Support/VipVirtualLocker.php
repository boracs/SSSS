<?php

declare(strict_types=1);

namespace App\Support;

final class VipVirtualLocker
{
    /** @return list<int> */
    public static function sharedNumbers(): array
    {
        $numbers = config('vip.shared_locker_numbers', [500, 600]);

        return array_values(array_unique(array_map('intval', (array) $numbers)));
    }

    public static function isShared(mixed $numeroTaquilla): bool
    {
        if ($numeroTaquilla === null || $numeroTaquilla === '' || $numeroTaquilla === '0' || $numeroTaquilla === 0) {
            return false;
        }

        return in_array((int) $numeroTaquilla, self::sharedNumbers(), true);
    }

    /** @deprecated Alias de isShared */
    public static function isVirtual(mixed $numeroTaquilla): bool
    {
        return self::isShared($numeroTaquilla);
    }

    public static function allowsMultipleAssignments(int $numero): bool
    {
        return self::isShared($numero);
    }
}
