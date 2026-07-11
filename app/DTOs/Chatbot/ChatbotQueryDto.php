<?php

declare(strict_types=1);

namespace App\DTOs\Chatbot;

/**
 * Consulta FAQ entrante (userId + texto extraído del historial).
 */
final readonly class ChatbotQueryDto
{
    public function __construct(
        public string $userId,
        public string $query,
    ) {}
}
