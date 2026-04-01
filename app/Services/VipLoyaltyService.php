<?php

namespace App\Services;

use Carbon\Carbon;

class VipLoyaltyService
{
    public const HEALTH_ACTIVE = 'active';

    public const HEALTH_DRIFTING = 'drifting';

    public const HEALTH_INACTIVE = 'inactive';

    /**
     * Días desde la última reserva confirmada (null = sin actividad).
     */
    public function daysSinceLastActivity(?Carbon $lastAt): ?int
    {
        if ($lastAt === null) {
            return null;
        }

        return (int) $lastAt->diffInDays(Carbon::now());
    }

    public function healthFromLastActivity(?Carbon $lastAt): string
    {
        $days = $this->daysSinceLastActivity($lastAt);
        if ($days === null) {
            return self::HEALTH_INACTIVE;
        }
        if ($days < 10) {
            return self::HEALTH_ACTIVE;
        }
        if ($days <= 25) {
            return self::HEALTH_DRIFTING;
        }

        return self::HEALTH_INACTIVE;
    }

    /**
     * Texto plano: sin HTML para evitar XSS al mostrar en cliente.
     */
    public function sanitizeNoteBody(string $body): string
    {
        $text = strip_tags($body);

        return trim(preg_replace('/\s+/u', ' ', $text));
    }
}
