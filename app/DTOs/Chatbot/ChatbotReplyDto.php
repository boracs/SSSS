<?php

declare(strict_types=1);

namespace App\DTOs\Chatbot;

/**
 * Respuesta síncrona del chatbot FAQ (sin IA ni persistencia externa).
 */
final readonly class ChatbotReplyDto
{
    public function __construct(
        public string $response,
        public string $context,
    ) {}

    /**
     * @return array{response: string, context: string}
     */
    public function toArray(): array
    {
        return [
            'response' => $this->response,
            'context' => $this->context,
        ];
    }
}
