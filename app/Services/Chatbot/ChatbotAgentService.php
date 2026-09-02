<?php

declare(strict_types=1);

namespace App\Services\Chatbot;

use App\DTOs\Chatbot\ChatbotAgentReplyDto;
use App\DTOs\Chatbot\ChatbotInteractionQueryDto;
use App\Enums\ChatbotInteractionStatus;
use App\Exceptions\Chatbot\GeminiUnavailableException;
use App\Jobs\Chatbot\PersistChatbotHistoryJob;
use App\Models\ChatbotInteraction;
use App\Models\User;
use App\Support\ChatbotDisplayName;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Orquestador del agente de soporte: sanitización preventiva → FAQ local
 * (gratis, instantánea) → Gemini acotado al contexto S4 (solo si el FAQ no
 * entiende) → evaluación de incertidumbre → derivación a humano.
 *
 * DECISIÓN DE DISEÑO (criterio senior, no es lo que se pidió literalmente):
 * NO se sustituye el motor regex por Gemini — se compone. El FAQ sigue
 * resolviendo gratis y con certeza absoluta ~lo que ya cubría (saludo, cómo
 * reservar, bonos, cancelaciones...); Gemini solo se invoca cuando el FAQ
 * devuelve 'fallback', y siempre acotado al contexto de negocio real
 * (ver {@see S4BusinessContextService}). Motivo: coste (Gemini es la parte
 * cara), fiabilidad (cero riesgo de alucinar un precio en el 80% de las
 * preguntas más comunes) y porque ya se dispone del matcher determinista —
 * "preferir reutilización sobre creación".
 *
 * Escalación a WhatsApp (requires_human) cuando:
 *   - 2 fallos de certeza consecutivos (contador en Cache por userId/sessionToken)
 *   - La respuesta que íbamos a dar es sustancialmente la misma que el turno anterior
 *     (también desde Cache; el history del cliente no decide)
 *   - El prompt guard detecta abuso / inyección en el message actual
 */
final class ChatbotAgentService
{
    /** Nº de "no entiendo" consecutivos antes de congelar el chat y derivar a WhatsApp. */
    private const FALLBACK_STREAK_THRESHOLD = 2;

    private const GEMINI_FALLBACK_TOKEN = '[TRIGGER_FALLBACK]';

    /** Turnos de historial reenviados a Gemini — acotado por coste/latencia, no por precisión. */
    private const GEMINI_HISTORY_WINDOW = 8;

    /**
     * Marcador exacto del "primer fallo" (FAQ + Gemini sin respuesta segura).
     * Se reutiliza tal cual como texto de cara al usuario para poder detectar,
     * de forma barata (sin llamadas extra), si el turno anterior fue también
     * un fallo — ver {@see self::isConsecutiveFallback()}.
     */
    private const SOFT_UNCERTAIN_MESSAGE = 'No tengo una respuesta 100% segura sobre eso. '
        .'¿Puedes reformular la pregunta o darme un poco más de detalle? '
        .'Si tampoco acierto a la segunda, te paso directamente con el equipo.';

    private const HUMAN_HANDOFF_MESSAGE = 'He avisado a **una persona del equipo** para que te ayude directamente. '
        .'Pulsa el botón de WhatsApp para continuar la conversación con tu **número de caso** ya incluido.';

    /** Contextos que no deben disparar escalación por “respuesta repetida”. */
    private const REPEAT_ESCALATION_SKIP_CONTEXTS = [
        'general.greeting',
    ];

    public function __construct(
        private readonly ChatbotService $chatbotService,
        private readonly ChatbotPromptGuard $promptGuard,
        private readonly GoogleAIService $googleAIService,
        private readonly S4BusinessContextService $businessContext,
        private readonly ChatbotArticleCatalogService $articleCatalog,
        private readonly ChatbotPageCatalogService $pageCatalog,
        private readonly ChatbotContactPhoneService $contactPhones,
    ) {}

    public function processInteraction(ChatbotInteractionQueryDto $query): ChatbotAgentReplyDto
    {
        $openInteraction = $this->findOpenInteraction($query->userId, $query->sessionToken);

        if ($openInteraction?->status === ChatbotInteractionStatus::REQUIRES_HUMAN) {
            $confidentFaq = $this->tryConfidentLocalReply($query);
            if ($confidentFaq !== null) {
                return new ChatbotAgentReplyDto(
                    $confidentFaq['text'],
                    $confidentFaq['context'],
                    requiresHuman: true,
                    caseReference: $openInteraction->case_reference,
                );
            }

            $geminiReply = $this->tryGeminiReply($query);
            if ($geminiReply !== null) {
                return new ChatbotAgentReplyDto(
                    $geminiReply['text'],
                    $geminiReply['context'],
                    requiresHuman: true,
                    caseReference: $openInteraction->case_reference,
                );
            }

            $articleRescue = $this->tryArticleRescueReply($query);
            if ($articleRescue !== null) {
                return new ChatbotAgentReplyDto(
                    $articleRescue['text'],
                    $articleRescue['context'],
                    requiresHuman: true,
                    caseReference: $openInteraction->case_reference,
                );
            }

            return new ChatbotAgentReplyDto(
                self::HUMAN_HANDOFF_MESSAGE,
                'requires_human',
                requiresHuman: true,
                caseReference: $openInteraction->case_reference,
            );
        }

        $flagReason = $this->promptGuard->detect($query->message);

        if ($flagReason !== null) {
            $interaction = $this->escalate($query, $flagReason);

            return new ChatbotAgentReplyDto(
                self::HUMAN_HANDOFF_MESSAGE,
                'requires_human',
                requiresHuman: true,
                caseReference: $interaction->case_reference,
            );
        }

        $resolved = $this->resolveReply($query);

        if ($resolved['uncertain'] && $this->isConsecutiveFallbackFromServer($query)) {
            $articleRescue = $this->tryArticleRescueReply($query);
            if ($articleRescue !== null) {
                $this->rememberSuccessfulReply($query, $articleRescue['text'], $articleRescue['context']);
                $this->persistSuccessfulTurn($query, $articleRescue['text']);

                return new ChatbotAgentReplyDto(
                    $articleRescue['text'],
                    $articleRescue['context'],
                    requiresHuman: false,
                );
            }

            if (! ($resolved['geminiUnavailable'] ?? false)) {
                return $this->handoffToHuman($query, 'uncertain_response');
            }
        }

        // Misma respuesta otra vez (p. ej. ficha de páginas genérica) → derivar.
        if ($this->isRepeatedAnswerFromServer($query, $resolved['text'], $resolved['context'])) {
            $articleRescue = $this->tryArticleRescueReply($query);
            if ($articleRescue !== null
                && ! $this->repliesAreEquivalent($articleRescue['text'], $resolved['text'])) {
                $this->rememberSuccessfulReply($query, $articleRescue['text'], $articleRescue['context']);
                $this->persistSuccessfulTurn($query, $articleRescue['text']);

                return new ChatbotAgentReplyDto(
                    $articleRescue['text'],
                    $articleRescue['context'],
                    requiresHuman: false,
                );
            }

            return $this->handoffToHuman($query, 'repeated_answer');
        }

        $this->rememberResolvedTurn($query, $resolved);
        $this->persistSuccessfulTurn($query, $resolved['text']);

        return new ChatbotAgentReplyDto($resolved['text'], $resolved['context'], requiresHuman: false);
    }

    private function handoffToHuman(ChatbotInteractionQueryDto $query, string $reason): ChatbotAgentReplyDto
    {
        $this->forgetSessionMemory($query);
        $interaction = $this->escalate($query, $reason);

        return new ChatbotAgentReplyDto(
            self::HUMAN_HANDOFF_MESSAGE,
            'requires_human',
            requiresHuman: true,
            caseReference: $interaction->case_reference,
        );
    }

    /**
     * FAQ local primero (gratis, cero riesgo). Solo si no entiende, se
     * consulta a Gemini acotado al contexto S4.
     *
     * @return array{text: string, context: string, uncertain: bool, geminiUnavailable?: bool}
     */
    private function resolveReply(ChatbotInteractionQueryDto $query): array
    {
        $displayName = $this->resolveAuthenticatedDisplayName();
        $localReply = $this->chatbotService->resolveQuery($query->message, $displayName, $query->userId);

        if ($localReply->context !== 'fallback') {
            return ['text' => $localReply->response, 'context' => $localReply->context, 'uncertain' => false];
        }

        $geminiResult = $this->tryGeminiReplyDetailed($query);
        if ($geminiResult['reply'] !== null) {
            return [
                'text' => $geminiResult['reply']['text'],
                'context' => $geminiResult['reply']['context'],
                'uncertain' => false,
            ];
        }

        $articleRescue = $this->tryArticleRescueReply($query);
        if ($articleRescue !== null) {
            return [
                'text' => $articleRescue['text'],
                'context' => $articleRescue['context'],
                'uncertain' => false,
            ];
        }

        return [
            'text' => self::SOFT_UNCERTAIN_MESSAGE,
            'context' => 'fallback',
            'uncertain' => true,
            'geminiUnavailable' => $geminiResult['unavailable'],
        ];
    }

    /**
     * @return array{reply: array{text: string, context: string}|null, unavailable: bool}
     */
    private function tryGeminiReplyDetailed(ChatbotInteractionQueryDto $query): array
    {
        return $this->invokeGeminiForQuery($query);
    }

    /**
     * @return array{text: string, context: string}|null
     */
    private function tryGeminiReply(ChatbotInteractionQueryDto $query): ?array
    {
        return $this->invokeGeminiForQuery($query)['reply'];
    }

    /**
     * @return array{reply: array{text: string, context: string}|null, unavailable: bool}
     */
    private function invokeGeminiForQuery(ChatbotInteractionQueryDto $query): array
    {
        $window = array_slice($query->history, -self::GEMINI_HISTORY_WINDOW);
        if ($this->historyContainsHostileTurn($window)) {
            return ['reply' => null, 'unavailable' => false];
        }

        if ($this->chatbotGeminiDailyLimitReached()) {
            return ['reply' => null, 'unavailable' => true];
        }

        try {
            $displayName = $this->resolveAuthenticatedDisplayName();
            $systemPrompt = $this->businessContext->buildSystemPrompt($displayName);
            $pageFocus = $this->pageCatalog->geminiFocusBlockForQuery($query->message);
            $articleFocus = $this->articleCatalog->geminiFocusBlockForQuery($query->message);

            if ($pageFocus !== '') {
                $systemPrompt .= "\n\nPÁGINAS RELEVANTES PARA ESTA PREGUNTA (priorizar si encajan):\n".$pageFocus;
            }

            if ($articleFocus !== '') {
                $systemPrompt .= "\n\nARTÍCULOS RELEVANTES PARA ESTA PREGUNTA (priorizar si encajan):\n".$articleFocus;
            }

            $this->consumeChatbotGeminiDailySlot();
            $geminiText = $this->googleAIService->generateReply($systemPrompt, $window, $query->message);

            if (str_contains($geminiText, self::GEMINI_FALLBACK_TOKEN)) {
                return ['reply' => null, 'unavailable' => false];
            }

            return [
                'reply' => [
                    'text' => $this->pageCatalog->enrichGeminiReply(
                        $this->articleCatalog->enrichGeminiReply($geminiText, $query->message),
                        $query->message,
                    ),
                    'context' => 'gemini',
                ],
                'unavailable' => false,
            ];
        } catch (GeminiUnavailableException $e) {
            Log::warning('ChatbotAgentService: Gemini no disponible.', ['error' => $e->getMessage()]);

            return ['reply' => null, 'unavailable' => true];
        }
    }

    /**
     * @return array{text: string, context: string}|null
     */
    private function tryArticleRescueReply(ChatbotInteractionQueryDto $query): ?array
    {
        $text = $this->articleCatalog->rescueReplyForQuery($query->message);

        if ($text === null) {
            return null;
        }

        return ['text' => $text, 'context' => 'taller.articles'];
    }

    /**
     * FAQ local con respuesta segura (context !== fallback). Usado tras escalación
     * para no bloquear preguntas lógicas (precios, logística, artículos…).
     *
     * @return array{text: string, context: string}|null
     */
    private function tryConfidentLocalReply(ChatbotInteractionQueryDto $query): ?array
    {
        $displayName = $this->resolveAuthenticatedDisplayName();
        $localReply = $this->chatbotService->resolveQuery($query->message, $displayName, $query->userId);

        if ($localReply->context === 'fallback') {
            return null;
        }

        return ['text' => $localReply->response, 'context' => $localReply->context];
    }

    /**
     * @param  list<array{role: string, text: string}>  $history
     */
    private function historyContainsHostileTurn(array $history): bool
    {
        foreach ($history as $turn) {
            $text = trim((string) ($turn['text'] ?? ''));
            if ($text !== '' && $this->promptGuard->detect($text) !== null) {
                return true;
            }
        }

        return false;
    }

    private function chatbotGeminiDailyCacheKey(): string
    {
        return 'chatbot:gemini-daily:'.now()->toDateString();
    }

    private function chatbotGeminiDailyLimitReached(): bool
    {
        $limit = max(0, (int) config('services.chatbot.gemini_daily_limit', 200));
        $used = (int) Cache::get($this->chatbotGeminiDailyCacheKey(), 0);

        if ($used < $limit) {
            return false;
        }

        Log::warning('chatbot.gemini_daily_limit_reached', [
            'used' => $used,
            'limit' => $limit,
        ]);

        return true;
    }

    private function consumeChatbotGeminiDailySlot(): void
    {
        $key = $this->chatbotGeminiDailyCacheKey();
        $used = (int) Cache::get($key, 0);
        Cache::put($key, $used + 1, now()->endOfDay());
    }

    /**
     * @return array{fallback_streak: int, last_reply: ?string, last_context: ?string}
     */
    private function readSessionMemory(ChatbotInteractionQueryDto $query): array
    {
        $empty = ['fallback_streak' => 0, 'last_reply' => null, 'last_context' => null];
        $key = $this->sessionMemoryKey($query);
        if ($key === null) {
            return $empty;
        }

        $stored = Cache::get($key);
        if (! is_array($stored)) {
            return $empty;
        }

        return [
            'fallback_streak' => (int) ($stored['fallback_streak'] ?? 0),
            'last_reply' => isset($stored['last_reply']) ? (string) $stored['last_reply'] : null,
            'last_context' => isset($stored['last_context']) ? (string) $stored['last_context'] : null,
        ];
    }

    /**
     * @param  array{fallback_streak: int, last_reply: ?string, last_context: ?string}  $memory
     */
    private function writeSessionMemory(ChatbotInteractionQueryDto $query, array $memory): void
    {
        $key = $this->sessionMemoryKey($query);
        if ($key === null) {
            return;
        }

        Cache::put($key, $memory, now()->addDay());
    }

    private function sessionMemoryKey(ChatbotInteractionQueryDto $query): ?string
    {
        if ($query->userId !== null) {
            return 'chatbot:session-memory:user:'.$query->userId;
        }

        $token = trim((string) ($query->sessionToken ?? ''));

        return $token !== '' ? 'chatbot:session-memory:session:'.$token : null;
    }

    private function forgetSessionMemory(ChatbotInteractionQueryDto $query): void
    {
        $key = $this->sessionMemoryKey($query);
        if ($key !== null) {
            Cache::forget($key);
        }
    }

    /** ¿El servidor ya entregó un fallo blando en esta sesión? No lee el payload. */
    private function isConsecutiveFallbackFromServer(ChatbotInteractionQueryDto $query): bool
    {
        $memory = $this->readSessionMemory($query);

        return $memory['fallback_streak'] >= (self::FALLBACK_STREAK_THRESHOLD - 1);
    }

    private function isRepeatedAnswerFromServer(
        ChatbotInteractionQueryDto $query,
        string $newText,
        string $newContext,
    ): bool {
        if (in_array($newContext, self::REPEAT_ESCALATION_SKIP_CONTEXTS, true)) {
            return false;
        }

        $last = $this->readSessionMemory($query)['last_reply'];
        if ($last === null || $last === '') {
            return false;
        }

        return $this->repliesAreEquivalent($last, $newText);
    }

    /**
     * @param  array{text: string, context: string, uncertain: bool, geminiUnavailable?: bool}  $resolved
     */
    private function rememberResolvedTurn(ChatbotInteractionQueryDto $query, array $resolved): void
    {
        if ($resolved['uncertain']) {
            $memory = $this->readSessionMemory($query);
            $this->writeSessionMemory($query, [
                'fallback_streak' => $memory['fallback_streak'] + 1,
                'last_reply' => $resolved['text'],
                'last_context' => $resolved['context'],
            ]);

            return;
        }

        $this->rememberSuccessfulReply($query, $resolved['text'], $resolved['context']);
    }

    private function rememberSuccessfulReply(ChatbotInteractionQueryDto $query, string $text, string $context): void
    {
        $this->writeSessionMemory($query, [
            'fallback_streak' => 0,
            'last_reply' => $text,
            'last_context' => $context,
        ]);
    }

    private function repliesAreEquivalent(string $a, string $b): bool
    {
        return $this->normalizeReplyForCompare($a) === $this->normalizeReplyForCompare($b);
    }

    /** Quita markdown/ruido para comparar si dos respuestas son la misma ficha. */
    private function normalizeReplyForCompare(string $text): string
    {
        $normalized = mb_strtolower(trim($text), 'UTF-8');
        $normalized = preg_replace('/\[([^\]]+)\]\([^)]+\)/u', '$1', $normalized) ?? $normalized;
        $normalized = str_replace(['*', '_', '`'], '', $normalized);
        $normalized = preg_replace('/\s+/u', ' ', $normalized) ?? $normalized;

        return trim($normalized);
    }

    private function findOpenInteraction(?int $userId, ?string $sessionToken): ?ChatbotInteraction
    {
        if ($userId === null && $sessionToken === null) {
            return null;
        }

        return ChatbotInteraction::query()
            ->openFor($userId, $sessionToken)
            ->latest('id')
            ->first();
    }

    private function escalate(ChatbotInteractionQueryDto $query, string $reason): ChatbotInteraction
    {
        return DB::transaction(function () use ($query, $reason): ChatbotInteraction {
            $interaction = ChatbotInteraction::query()
                ->openFor($query->userId, $query->sessionToken)
                ->lockForUpdate()
                ->latest('id')
                ->first();

            $history = ChatbotInteraction::trimHistory([
                ...$query->history,
                ['role' => 'user', 'text' => $query->message],
            ]);

            if ($interaction === null) {
                $created = ChatbotInteraction::create([
                    'user_id' => $query->userId,
                    'session_token' => $query->userId === null ? $query->sessionToken : null,
                    'status' => ChatbotInteractionStatus::REQUIRES_HUMAN,
                    'history' => $history,
                    'flag_reason' => $reason,
                    'ip_address' => $query->ip,
                ]);
                $this->contactPhones->syncFromUserProfile($created);

                return $created->fresh();
            }

            $interaction->update([
                'status' => ChatbotInteractionStatus::REQUIRES_HUMAN,
                'history' => $history,
                'flag_reason' => $reason,
                'ip_address' => $query->ip,
            ]);

            $this->contactPhones->syncFromUserProfile($interaction);

            return $interaction->fresh();
        });
    }

    /** Persistencia no bloqueante: solo aporta valor de auditoría para usuarios logueados. */
    private function persistSuccessfulTurn(ChatbotInteractionQueryDto $query, string $botReply): void
    {
        if ($query->userId === null) {
            return;
        }

        $historySnapshot = [
            ...$query->history,
            ['role' => 'user', 'text' => $query->message],
            ['role' => 'model', 'text' => $botReply],
        ];

        PersistChatbotHistoryJob::dispatch($query->userId, $historySnapshot, $query->ip);
    }

    /**
     * Nombre para personalización — solo desde sesión Laravel (nunca desde el frontend).
     * Degradación elegante: null si visitante anónimo o sin nombre usable.
     */
    private function resolveAuthenticatedDisplayName(): ?string
    {
        $user = Auth::user();

        if (! $user instanceof User) {
            return null;
        }

        $name = ChatbotDisplayName::firstFromFull((string) ($user->nombre ?? ''));

        return $name;
    }
}
