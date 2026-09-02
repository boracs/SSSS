<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Nombre corto para el chatbot: solo el primero, desde la ficha del usuario (BD).
 */
final class ChatbotDisplayName
{
    public static function firstFromFull(?string $nombre): ?string
    {
        $nombre = trim((string) $nombre);
        if ($nombre === '' || preg_match('/[\[\]{}<>\r\n]/u', $nombre) === 1) {
            return null;
        }

        $collapsed = preg_replace('/\s+/u', ' ', $nombre) ?? $nombre;
        $first = trim(explode(' ', $collapsed, 2)[0], " \t\n\r\0\x0B.,;:!¡¿-");
        if ($first === '' || mb_strlen($first) > 40) {
            return null;
        }

        if (! self::isAllowlisted($first)) {
            return null;
        }

        return $first;
    }

    /** Letras (tildes/ñ), espacios, apóstrofe y guion. Rechaza tokens de inyección. */
    private static function isAllowlisted(string $name): bool
    {
        if (preg_match('/^[\\p{L}]+(?:[ \'\\-][\\p{L}]+)*$/u', $name) !== 1) {
            return false;
        }

        return preg_match('/\\b(ignor\\w*|olvid\\w*|disregard|forget|jailbreak|system|prompt|override)\\b/iu', $name) !== 1;
    }
}
