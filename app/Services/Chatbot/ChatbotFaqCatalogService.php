<?php

declare(strict_types=1);

namespace App\Services\Chatbot;

use App\DTOs\Chatbot\ChatbotReplyDto;
use App\Support\ChatbotQueryNormalizer;

/**
 * Catálogo de intents FAQ (config/chatbot_faq.php): matching por regex y
 * respuestas estáticas o dinámicas (cuenta del usuario).
 */
final class ChatbotFaqCatalogService
{
    public function __construct(
        private readonly ChatbotUserAccountFaqService $userAccountFaq,
    ) {}

    public function replyForQuery(string $rawQuery, ?int $userId = null): ?ChatbotReplyDto
    {
        $normalized = ChatbotQueryNormalizer::forMatching($rawQuery);
        if ($normalized === '') {
            return null;
        }

        $intent = $this->matchIntent($normalized);
        if ($intent === null) {
            return null;
        }

        $requiresAuth = (bool) ($intent['requires_auth'] ?? false);
        if ($requiresAuth && $userId === null) {
            $guest = trim((string) ($intent['guest_response'] ?? ''));
            if ($guest === '') {
                return null;
            }

            return new ChatbotReplyDto($guest, $intent['key'].'.guest');
        }

        $handler = (string) $intent['handler'];

        if ($handler === 'static') {
            $response = trim((string) ($intent['response'] ?? ''));
            if ($response === '') {
                return null;
            }

            return new ChatbotReplyDto($response, $intent['key']);
        }

        if ($userId === null) {
            return null;
        }

        $dynamicText = $this->resolveDynamicHandler($handler, $userId);
        if ($dynamicText === null) {
            return null;
        }

        return new ChatbotReplyDto($dynamicText, $intent['key']);
    }

    /** Bloque compacto de preguntas ejemplo para el system prompt de Gemini. */
    public function geminiSampleQuestionsBlock(): string
    {
        $lines = [];
        foreach ($this->intents() as $intent) {
            $samples = $intent['sample_questions'] ?? [];
            if ($samples === []) {
                continue;
            }
            $lines[] = sprintf(
                '- %s (intent %s): %s',
                $intent['title'],
                $intent['key'],
                implode(' · ', array_slice($samples, 0, 3)),
            );
        }

        return $lines === [] ? '' : implode("\n", $lines);
    }

    /**
     * @return array{key: string, title: string, sample_questions: list<string>, patterns: list<string>, handler: string, response?: string, requires_auth?: bool, guest_response?: string, priority: int}|null
     */
    private function matchIntent(string $normalizedQuery): ?array
    {
        $best = null;
        $bestScore = -1;

        foreach ($this->intents() as $intent) {
            foreach ($intent['patterns'] as $pattern) {
                if (preg_match($pattern, $normalizedQuery) !== 1) {
                    continue;
                }

                $score = (int) $intent['priority'];
                if ($score > $bestScore) {
                    $bestScore = $score;
                    $best = $intent;
                }
            }
        }

        return $best;
    }

    private function resolveDynamicHandler(string $handler, int $userId): ?string
    {
        return match ($handler) {
            'dynamic:locker_status' => $this->userAccountFaq->lockerStatusReply($userId),
            'dynamic:bono_balance' => $this->userAccountFaq->bonoBalanceReply($userId),
            default => null,
        };
    }

    /**
     * @return list<array{key: string, title: string, sample_questions: list<string>, patterns: list<string>, handler: string, response?: string, requires_auth?: bool, guest_response?: string, priority: int}>
     */
    private function intents(): array
    {
        /** @var list<array{key: string, title: string, sample_questions: list<string>, patterns: list<string>, handler: string, response?: string, requires_auth?: bool, guest_response?: string, priority?: int}> $intents */
        $intents = config('chatbot_faq.intents', []);

        return array_map(static function (array $intent): array {
            $intent['priority'] = (int) ($intent['priority'] ?? 0);

            return $intent;
        }, $intents);
    }
}
