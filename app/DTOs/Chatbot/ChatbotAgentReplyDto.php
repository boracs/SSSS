<?php

declare(strict_types=1);

namespace App\DTOs\Chatbot;

/**
 * Respuesta del agente al frontend: texto + estado de derivación a humano.
 */
final readonly class ChatbotAgentReplyDto
{
    public function __construct(
        public string $message,
        public string $context,
        public bool $requiresHuman,
        public ?string $caseReference = null,
    ) {}

    /**
     * @return array{message: string, context: string, requiresHuman: bool, caseReference: ?string}
     */
    public function toArray(): array
    {
        return [
            'message' => $this->message,
            'context' => $this->context,
            'requiresHuman' => $this->requiresHuman,
            'caseReference' => $this->caseReference,
        ];
    }
}
