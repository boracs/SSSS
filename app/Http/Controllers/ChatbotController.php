<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Actions\Chatbot\ProcessChatbotQueryAction;
use App\Http\Requests\Chatbot\ChatbotArtifactRequest;
use App\Http\Requests\Chatbot\RegisterChatbotContactPhoneRequest;
use App\Http\Requests\Chatbot\SanitizedChatbotRequest;
use App\Models\ChatbotInteraction;
use App\Services\Chatbot\ChatbotContactPhoneService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

final class ChatbotController extends Controller
{
    public function __construct(
        private readonly ProcessChatbotQueryAction $processChatbotQuery,
        private readonly ChatbotContactPhoneService $contactPhones,
    ) {}

    public function handleMessage(SanitizedChatbotRequest $request): JsonResponse
    {
        try {
            $reply = $this->processChatbotQuery->execute($request->toDto());

            return response()->json($reply->toArray());
        } catch (\Throwable $e) {
            Log::error('ChatbotController::handleMessage: '.$e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json(['message' => 'Error interno del servidor.'], 500);
        }
    }

    /**
     * Carga perezosa del historial guardado para un usuario autenticado
     * (interacción abierta más reciente). Anónimos siempre parten de LocalStorage.
     */
    public function history(Request $request): JsonResponse
    {
        $userId = $request->user()?->id;

        if ($userId === null) {
            return response()->json(['history' => [], 'status' => null, 'caseReference' => null]);
        }

        $interaction = ChatbotInteraction::query()
            ->openFor($userId, null)
            ->latest('id')
            ->first();

        return response()->json([
            'history' => $interaction?->history ?? [],
            'status' => $interaction?->status?->value,
            'caseReference' => $interaction?->case_reference,
            'contactPhone' => $interaction?->contact_phone_display,
        ]);
    }

    /** Guarda el móvil del visitante al pulsar WhatsApp (caso derivado a humano). */
    public function registerContactPhone(RegisterChatbotContactPhoneRequest $request): JsonResponse
    {
        try {
            $interaction = $this->contactPhones->register(
                auth()->id(),
                auth()->guest() ? $request->validated('sessionToken') : null,
                (string) $request->validated('phone'),
                $request->validated('caseReference'),
            );
        } catch (\RuntimeException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }

        return response()->json([
            'success' => true,
            'contactPhone' => $interaction->contact_phone_display,
            'caseReference' => $interaction->case_reference,
        ]);
    }

    public function extractAndSaveArtifact(ChatbotArtifactRequest $request): JsonResponse
    {
        return response()->json(['message' => 'Memoria externa desactivada; FAQ local activa.'], 200);
    }
}
