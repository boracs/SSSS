<?php

declare(strict_types=1);

namespace App\Services\Chatbot;

/**
 * Detección preventiva de prompts hostiles antes de que el payload toque
 * cualquier Service de negocio. Puramente sintáctica — sin llamadas externas.
 */
final class ChatbotPromptGuard
{
    /**
     * @var array<string, string>
     */
    private const PATTERNS = [
        // "ignora las instrucciones anteriores / reglas del sistema"
        'prompt_injection' => '/\b(ignor|olvid|disregard|forget)\w*\b[^.\n]{0,50}\b(instru\w+|regla\w*|previous|anterior\w*|rules?|prompt)\b/iu',
        // "actúa como / eres ahora / modo desarrollador / jailbreak"
        'role_override' => '/\b(actua(r)?\s+como|act\s+as|eres\s+ahora|you\s+are\s+now|system\s*prompt|jailbreak|dev\s*mode|override\s+rules?)\b/iu',
        // Intentos de inyección SQL dentro del texto libre
        'sql_injection' => '/\b(drop\s+table|delete\s+from|update\s+\w+\s+set|union\s+select|insert\s+into)\b|--\s|;\s*--/iu',
        // Intentos de inyección de script/HTML
        'script_injection' => '/<\s*script\b|javascript\s*:|on(error|load|click)\s*=/iu',
    ];

    /** Devuelve la clave del patrón detectado o null si el mensaje es seguro. */
    public function detect(string $message): ?string
    {
        foreach (self::PATTERNS as $reason => $pattern) {
            if (preg_match($pattern, $message) === 1) {
                return $reason;
            }
        }

        return null;
    }
}
