<?php

declare(strict_types=1);

namespace App\Http\Requests\Chatbot;

use App\DTOs\Chatbot\ChatbotInteractionQueryDto;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\Log;

/**
 * Punto de entrada sanitizado del chatbot público.
 * `message` es la única entrada libre real; `history` solo alimenta la
 * detección de incertidumbre repetida (nunca se confía en su contenido para autorización).
 */
final class SanitizedChatbotRequest extends FormRequest
{
    /** Debe coincidir con {@see \App\Models\ChatbotInteraction::MAX_HISTORY_TURNS}. */
    private const MAX_HISTORY_TURNS = 24;

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $history = $this->input('history', []);
        if (! is_array($history)) {
            $history = [];
        }

        $sanitizedHistory = [];
        foreach ($history as $entry) {
            if (! is_array($entry)) {
                continue;
            }
            $role = strip_tags(trim((string) ($entry['role'] ?? '')));
            $text = strip_tags(trim((string) ($entry['text'] ?? '')));
            if ($role === '' || $text === '') {
                continue;
            }
            $sanitizedHistory[] = [
                'role' => $role,
                'text' => mb_substr($text, 0, 500),
            ];
        }

        $this->merge([
            'message' => strip_tags(trim((string) $this->input('message', ''))),
            'sessionToken' => strip_tags(trim((string) $this->input('sessionToken', ''))) ?: null,
            'history' => array_slice($sanitizedHistory, -self::MAX_HISTORY_TURNS),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'message' => ['required', 'string', 'max:500'],
            'sessionToken' => ['nullable', 'string', 'max:64'],
            'history' => ['nullable', 'array', 'max:24'],
            'history.*.role' => ['required_with:history', 'string', 'in:user,model'],
            'history.*.text' => ['required_with:history', 'string', 'max:500'],
        ];
    }

    public function toDto(): ChatbotInteractionQueryDto
    {
        /** @var list<array{role: string, text: string}> $history */
        $history = $this->validated('history') ?? [];

        return new ChatbotInteractionQueryDto(
            message: (string) $this->validated('message'),
            userId: auth()->id(),
            sessionToken: auth()->guest() ? $this->validated('sessionToken') : null,
            ip: (string) $this->ip(),
            history: $history,
        );
    }

    protected function failedValidation(Validator $validator): void
    {
        Log::warning('SanitizedChatbotRequest: validación fallida', [
            'errors' => $validator->errors()->toArray(),
            'ip' => $this->ip(),
        ]);

        throw new HttpResponseException(
            response()->json(['message' => 'Fallo en la validación de la solicitud.'], 422)
        );
    }
}
