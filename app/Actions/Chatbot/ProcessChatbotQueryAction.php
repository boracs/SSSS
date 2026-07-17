<?php

declare(strict_types=1);

namespace App\Actions\Chatbot;

use App\DTOs\Chatbot\ChatbotAgentReplyDto;
use App\DTOs\Chatbot\ChatbotInteractionQueryDto;
use App\Services\Chatbot\ChatbotAgentService;

/**
 * Punto de entrada único del agente: DTO → ChatbotAgentService (guard + FAQ + derivación).
 */
final class ProcessChatbotQueryAction
{
    public function __construct(
        private readonly ChatbotAgentService $chatbotAgentService,
    ) {}

    public function execute(ChatbotInteractionQueryDto $dto): ChatbotAgentReplyDto
    {
        return $this->chatbotAgentService->processInteraction($dto);
    }
}
