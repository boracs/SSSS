<?php

declare(strict_types=1);

namespace App\Exceptions\Chatbot;

use RuntimeException;

/**
 * Gemini no configurado, caído, o respuesta inválida. NUNCA debe traducirse
 * en un 500 al cliente: {@see \App\Services\Chatbot\ChatbotAgentService}
 * la captura y degrada de forma controlada al estado de incertidumbre.
 */
final class GeminiUnavailableException extends RuntimeException {}
