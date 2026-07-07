<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\Lesson;
use Carbon\Carbon;

/**
 * Ventanas y cupos de inscripción/cancelación para clases academy y VIP.
 */
final class AcademyEnrollmentPolicy
{
    public static function enrollCutoffMinutes(): int
    {
        return max(1, (int) config('services.academy.enroll_cutoff_minutes', 30));
    }

    public static function cancelCutoffHours(): int
    {
        return max(1, (int) config('services.academy.cancel_cutoff_hours', 4));
    }

    public static function standardMonitorCapacity(): int
    {
        return max(1, (int) config('services.academy.standard_monitor_capacity', 6));
    }

    public static function minutesUntilStart(?Carbon $startsAt): ?int
    {
        if ($startsAt === null) {
            return null;
        }

        return (int) BusinessDateTime::now()->diffInMinutes(
            $startsAt->copy()->timezone(BusinessDateTime::businessTimezone()),
            false
        );
    }

    public static function canEnrollByTime(?Lesson $lesson): bool
    {
        if ($lesson?->starts_at === null) {
            return false;
        }

        $minutes = self::minutesUntilStart($lesson->starts_at);

        return $minutes !== null && $minutes >= self::enrollCutoffMinutes();
    }

    public static function enrollBlockedMessage(): string
    {
        return 'Las inscripciones cierran '.self::enrollCutoffMinutes().' minutos antes del inicio de la clase.';
    }

    public static function canCancelByTime(?Lesson $lesson): bool
    {
        if ($lesson?->starts_at === null) {
            return false;
        }

        $minutes = self::minutesUntilStart($lesson->starts_at);

        return $minutes !== null && $minutes >= (self::cancelCutoffHours() * 60);
    }

    public static function cancelBlockedMessage(): string
    {
        return 'No se puede cancelar con menos de '.self::cancelCutoffHours().' horas de antelación.';
    }

    public static function requiresAdminQuotaApproval(int $occupiedSeats, int $incomingPartySize): bool
    {
        return ($occupiedSeats + max(1, $incomingPartySize)) > self::standardMonitorCapacity();
    }

    public static function quotaPendingMessage(): string
    {
        return 'Esta plaza supera el cupo estándar de '.self::standardMonitorCapacity()
            .' alumnos. Debes solicitar permiso a un administrador; cuando confirme que hay monitor disponible, podrá aceptarte desde el panel de gestión.';
    }
}
