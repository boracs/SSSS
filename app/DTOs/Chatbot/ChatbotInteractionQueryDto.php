<?php

declare(strict_types=1);

namespace App\DTOs\Chatbot;

/**
 * Consulta entrante al agente: mensaje + identidad (usuario o sesión anónima) + contexto de red.
 *
 * @property-read list<array{role: string, text: string}> $history
 */
final readonly class ChatbotInteractionQueryDto
{
    /**
     * @param  list<array{role: string, text: string}>  $history  Turnos previos enviados por el cliente (sin persistir en servidor para anónimos).
     */
    public function __construct(
        public string $message,
        public ?int $userId,
        public ?string $sessionToken,
        public string $ip,
        public array $history = [],
    ) {}
}
