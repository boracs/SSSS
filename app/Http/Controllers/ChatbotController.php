<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Actions\Chatbot\ProcessChatbotQueryAction;
use App\Http\Requests\Chatbot\ChatbotArtifactRequest;
use App\Http\Requests\Chatbot\ChatbotMessageRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

final class ChatbotController extends Controller
{
    public function __construct(
        private readonly ProcessChatbotQueryAction $processChatbotQuery,
    ) {}

    public function handleMessage(ChatbotMessageRequest $request): JsonResponse
    {
        try {
            $reply = $this->processChatbotQuery->execute($request->toDto());

            return response()->json($reply->toArray() + ['message' => $reply->response]);
        } catch (\Throwable $e) {
            Log::error('ChatbotController::handleMessage: '.$e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json(['message' => 'Error interno del servidor.'], 500);
        }
    }

    public function extractAndSaveArtifact(ChatbotArtifactRequest $request): JsonResponse
    {
        return response()->json(['message' => 'Memoria externa desactivada; FAQ local activa.'], 200);
    }
}
