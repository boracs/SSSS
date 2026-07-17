<?php

declare(strict_types=1);

namespace App\Services\Chatbot;

use App\Exceptions\Chatbot\GeminiUnavailableException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Cliente HTTP (Laravel `Http::withHeaders()`) hacia Gemini `generateContent`.
 *
 * Deliberadamente SIN `tools => google_search`: el grounding por búsqueda web
 * contradice la regla de negocio "responde ÚNICAMENTE con el contexto provisto"
 * — permitirlo abriría la puerta a que el modelo conteste con datos externos
 * no verificados (precios, políticas) en nombre de la escuela.
 */
final class GoogleAIService
{
    private const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent';

    private const TIMEOUT_SECONDS = 12;

    /**
     * @param  list<array{role: string, text: string}>  $history  Turnos previos (sin el mensaje actual).
     */
    public function generateReply(string $systemInstruction, array $history, string $currentMessage): string
    {
        $apiKey = trim((string) config('services.gemini.key', ''));

        if ($apiKey === '') {
            throw new GeminiUnavailableException('GEMINI_API_KEY no configurada.');
        }

        $model = trim((string) config('services.gemini.model', 'gemini-2.5-flash'));

        $contents = array_map(
            static fn (array $turn): array => [
                'role' => ($turn['role'] ?? 'user') === 'model' ? 'model' : 'user',
                'parts' => [['text' => (string) ($turn['text'] ?? '')]],
            ],
            $history,
        );
        $contents[] = ['role' => 'user', 'parts' => [['text' => $currentMessage]]];

        try {
            $response = Http::timeout(self::TIMEOUT_SECONDS)
                ->withHeaders(['Content-Type' => 'application/json'])
                ->post(sprintf(self::ENDPOINT, $model).'?key='.$apiKey, [
                    'contents' => $contents,
                    'systemInstruction' => ['parts' => [['text' => $systemInstruction]]],
                    'generationConfig' => [
                        // Temperatura baja: priorizamos certeza factual sobre creatividad (precios, políticas).
                        'temperature' => 0.2,
                        'maxOutputTokens' => 350,
                    ],
                ]);
        } catch (Throwable $e) {
            Log::warning('GoogleAIService: fallo de red hacia Gemini.', ['error' => $e->getMessage()]);

            throw new GeminiUnavailableException('Fallo de red hacia Gemini: '.$e->getMessage(), previous: $e);
        }

        if ($response->failed()) {
            Log::warning('GoogleAIService: Gemini respondió con error HTTP.', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            throw new GeminiUnavailableException("Gemini HTTP {$response->status()}");
        }

        $text = $response->json('candidates.0.content.parts.0.text');

        if (! is_string($text) || trim($text) === '') {
            throw new GeminiUnavailableException('Respuesta vacía o con formato inesperado de Gemini.');
        }

        return trim($text);
    }
}
