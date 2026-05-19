<?php

namespace App\Support;

/**
 * Contacto genérico de la escuela para plantillas (WhatsApp, etc.).
 * Número en {@see config('services.academy.whatsapp_number')} / .env ACADEMY_WHATSAPP_NUMBER;
 * texto legible opcional en ACADEMY_WHATSAPP_DISPLAY.
 */
final class AcademyContact
{
    public static function whatsappDisplay(): string
    {
        $display = trim((string) (config('services.academy.whatsapp_display') ?? ''));
        if ($display !== '' && self::isSafePublicDisplayString($display)) {
            return $display;
        }

        $digits = preg_replace('/\D+/', '', (string) config('services.academy.whatsapp_number', '')) ?: '';

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
