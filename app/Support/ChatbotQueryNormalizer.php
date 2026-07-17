<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Normalización de consultas del chatbot: acentos + sinónimos de raíz verbal
 * para que "reparo", "reparar" y "reparación" matcheen los mismos patrones/artículos.
 */
final class ChatbotQueryNormalizer
{
    /** @var array<string, string> */
    private const ACCENT_MAP = [
        'á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u', 'ü' => 'u', 'ñ' => 'n',
    ];

    /**
     * Raíz verbal → términos canónicos añadidos al texto de matching.
     *
     * @var array<string, string>
     */
    private const VERB_STEM_SYNONYMS = [
        'repar' => 'reparar reparacion arreglar arreglo',
        'arregl' => 'arreglar arreglo reparar reparacion',
        'reserv' => 'reservar reserva apuntar inscribir',
        'apunt' => 'apuntar apuntarse inscribir reservar',
        'inscrib' => 'inscribir inscripcion reservar apuntar',
        'aprend' => 'aprender aprendizaje',
        'alquil' => 'alquilar alquiler rentar',
        'cancel' => 'cancelar cancelacion anular',
        'devolv' => 'devolver devolucion reembolso',
        'funcion' => 'funcionar funcionamiento',
    ];

    public static function normalize(string $query): string
    {
        $text = mb_strtolower(trim($query));
        if ($text === '') {
            return '';
        }

        return strtr($text, self::ACCENT_MAP);
    }

    /** Texto listo para regex, tokens y catálogos (incluye sinónimos de raíz verbal). */
    public static function forMatching(string $query): string
    {
        $base = self::normalize($query);
        if ($base === '') {
            return '';
        }

        $extras = [];
        foreach (self::VERB_STEM_SYNONYMS as $stem => $synonyms) {
            if (preg_match('/\b'.preg_quote($stem, '/').'\w*/u', $base) === 1) {
                $extras[] = $synonyms;
            }
        }

        if ($extras === []) {
            return $base;
        }

        return $base.' '.implode(' ', $extras);
    }
}
