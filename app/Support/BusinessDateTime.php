<?php

namespace App\Support;

use DateTimeInterface;
use Illuminate\Support\Carbon;

/**
 * Fechas de negocio (clases): {@see config('services.academy.business_timezone')} (por defecto Europe/Madrid),
 * independiente de APP_TIMEZONE para que la BD naive no se lea como UTC.
 *
 * toApi() evita el ISO en UTC de Carbon::toIso8601String()/toJSON(), que desplaza la hora en el cliente.
 */
final class BusinessDateTime
{
    /**
     * Zona del calendario escolar (clases); por defecto Europe/Madrid vía config.
     */
    public static function businessTimezone(): string
    {
        return (string) config('services.academy.business_timezone', 'Europe/Madrid');
    }

    public static function now(): Carbon
    {
        return Carbon::now(self::businessTimezone());
    }

    public static function today(): Carbon
    {
        return self::now()->startOfDay();
    }

    /** @deprecated usar businessTimezone() */
    public static function appTimezone(): string
    {
        return self::businessTimezone();
    }

    /**
     * ISO-8601 con offset de negocio (ej. 2026-04-02T10:00:00+02:00), no Z UTC.
     */
    public static function toApi(DateTimeInterface $date): string
    {
        return Carbon::instance($date)
            ->timezone(self::businessTimezone())
            ->format('Y-m-d\TH:i:sP');
    }

    /**
     * Cadena lista para columnas datetime naive en BD (reloj de pared en zona de negocio).
     */
    public static function toDatabaseString(DateTimeInterface $date): string
    {
        return Carbon::instance($date)
            ->timezone(self::businessTimezone())
            ->format('Y-m-d H:i:s');
    }

    /**
     * Entrada del modal / API sin zona: "Y-m-d H:i:s" o "Y-m-dTH:i" / "Y-m-dTH:i:s" = reloj de pared en la escuela.
     */
    public static function parseInAppTimezone(string $datetime): Carbon
    {
        $tz = self::businessTimezone();
        $trim = trim($datetime);
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $trim)) {
            return Carbon::createFromFormat('Y-m-d', $trim, $tz)->startOfDay();
        }

        $normalized = str_replace('T', ' ', $trim);

        if (preg_match('/^(\d{4}-\d{2}-\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/', $normalized, $m)) {
            $sec = $m[4] ?? '00';

            return Carbon::createFromFormat(
                'Y-m-d H:i:s',
                "{$m[1]} {$m[2]}:{$m[3]}:{$sec}",
                $tz
            );
        }

        return Carbon::parse($trim, $tz)->timezone($tz);
    }
}
