<?php

declare(strict_types=1);

namespace App\Actions\Chatbot;

use App\DTOs\Chatbot\ChatbotQueryDto;
use App\DTOs\Chatbot\ChatbotReplyDto;
use App\Services\Chatbot\ChatbotService;

/**
 * Punto de entrada único FAQ: DTO → ChatbotService (síncrono, sin BD).
 */
final class ProcessChatbotQueryAction
{
    public function __construct(
        private readonly ChatbotService $chatbotService,
    ) {}

    public function execute(ChatbotQueryDto $dto): ChatbotReplyDto
    {
        return $this->chatbotService->resolveQuery($dto->query);
    }
}
