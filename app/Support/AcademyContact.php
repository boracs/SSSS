<?php

namespace App\Support;

/**
 * Contacto genérico de la escuela para plantillas (WhatsApp, etc.).
 * Número en {@see config('services.academy.whatsapp_number')} / .env ACADEMY_WHATSAPP_NUMBER;
 * texto legible opcional en ACADEMY_WHATSAPP_DISPLAY.
 */
final class AcademyContact
{
    public static function whatsappDigits(): string
    {
        return preg_replace('/\D+/', '', (string) config('services.academy.whatsapp_number', '')) ?: '';
    }

    /** URL base wa.me sin mensaje predefinido. */
    public static function whatsappBaseUrl(): ?string
    {
        $digits = self::whatsappDigits();

        return $digits !== '' ? 'https://wa.me/'.$digits : null;
    }

    /** Enlace wa.me opcional con mensaje codificado. */
    public static function whatsappUrl(?string $message = null): ?string
    {
        $base = self::whatsappBaseUrl();
        if ($base === null) {
            return null;
        }

        if ($message === null || trim($message) === '') {
            return $base;
        }

        return $base.'?text='.rawurlencode(trim($message));
    }

    /** wa.me para cualquier teléfono (reparadores, alumnos, etc.). */
    public static function urlForPhone(string $phone, ?string $message = null): ?string
    {
        $digits = preg_replace('/\D+/', '', $phone);
        if ($digits === '') {
            return null;
        }

        $base = 'https://wa.me/'.$digits;
        if ($message === null || trim($message) === '') {
            return $base;
        }

        return $base.'?text='.rawurlencode(trim($message));
    }

    /** Email de contacto público de la escuela ({@see config('services.academy.contact_email')}). */
    public static function contactEmail(): string
    {
        return trim((string) config('services.academy.contact_email', ''));
    }

    public static function whatsappDisplay(): string
    {
        $display = trim((string) (config('services.academy.whatsapp_display') ?? ''));
        if ($display !== '' && self::isSafePublicDisplayString($display)) {
            return $display;
        }

        $digits = self::whatsappDigits();

        if ($digits === '') {
            return '';
        }

        if (str_starts_with($digits, '34') && strlen($digits) >= 11) {
            $local = substr($digits, 2, 9);
            if (strlen($local) === 9) {
                return sprintf('+34 %s %s %s', substr($local, 0, 3), substr($local, 3, 3), substr($local, 6, 3));
            }
        }

        return strlen($digits) > 0 ? '+'.$digits : '';
    }

    /**
     * Evita mostrar en UI pegados accidentales (p. ej. código PHP en .env).
     */
    private static function isSafePublicDisplayString(string $value): bool
    {
        if (strlen($value) > 280) {
            return false;
        }

        if (str_contains($value, '<?php') || str_contains($value, 'namespace ')) {
            return false;
        }

        if (str_contains($value, 'declare(strict_types')) {
            return false;
        }

        return true;
    }
}
