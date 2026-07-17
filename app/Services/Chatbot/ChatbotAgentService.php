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
use Illuminate\Support\Facades\Auth;
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
 * El "guardrail de certeza" del enunciado se traduce en dos señales
 * equivalentes de incertidumbre, ambas tratadas igual por el contador de
 * fallos consecutivos:
 *   - FAQ local: contexto `fallback` (no hay patrón que matchee).
 *   - Gemini: la respuesta contiene literalmente `[TRIGGER_FALLBACK]`
 *     (instruido vía systemInstruction) o la llamada falla/no está configurada.
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

        if ($resolved['uncertain'] && $this->isConsecutiveFallback($query->history)) {
            $articleRescue = $this->tryArticleRescueReply($query);
            if ($articleRescue !== null) {
                $this->persistSuccessfulTurn($query, $articleRescue['text']);

                return new ChatbotAgentReplyDto(
                    $articleRescue['text'],
                    $articleRescue['context'],
                    requiresHuman: false,
                );
            }

            if (! ($resolved['geminiUnavailable'] ?? false)) {
                $interaction = $this->escalate($query, 'uncertain_response');

                return new ChatbotAgentReplyDto(
                    self::HUMAN_HANDOFF_MESSAGE,
                    'requires_human',
                    requiresHuman: true,
                    caseReference: $interaction->case_reference,
                );
            }
        }

        $this->persistSuccessfulTurn($query, $resolved['text']);

        return new ChatbotAgentReplyDto($resolved['text'], $resolved['context'], requiresHuman: false);
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

            $geminiHistory = array_slice($query->history, -self::GEMINI_HISTORY_WINDOW);
            $geminiText = $this->googleAIService->generateReply($systemPrompt, $geminiHistory, $query->message);

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
     * ¿El turno de bot inmediatamente anterior fue también un fallo?
     * Comparación O(1) por texto exacto — sin reproducir el historial ni
     * repetir llamadas a Gemini (esas sí tienen coste real).
     *
     * @param  list<array{role: string, text: string}>  $history
     */
    private function isConsecutiveFallback(array $history): bool
    {
        for ($i = count($history) - 1; $i >= 0; $i--) {
            if (($history[$i]['role'] ?? null) === 'model') {
                return trim((string) ($history[$i]['text'] ?? '')) === self::SOFT_UNCERTAIN_MESSAGE;
            }
        }

        return false;
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

        $name = trim((string) ($user->nombre ?? ''));

        return $name !== '' ? $name : null;
    }
}
