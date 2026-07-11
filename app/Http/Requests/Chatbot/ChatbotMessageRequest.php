<?php

declare(strict_types=1);

namespace App\Http\Requests\Chatbot;

use App\DTOs\Chatbot\ChatbotQueryDto;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\Log;

final class ChatbotMessageRequest extends FormRequest
{
    public function authorize(): bool
    {
        $userId = (string) $this->input('userId', '');

        if (! auth()->check()) {
            return $userId !== '';
        }

        $authorized = $userId === (string) auth()->id();

        if (! $authorized) {
            Log::warning('Chatbot: intento de spoofing userId', [
                'sent_id' => $userId,
                'expected_id' => (string) auth()->id(),
                'ip' => $this->ip(),
            ]);
        }

        return $authorized;
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
                'text' => mb_substr($text, 0, 4000),
            ];
        }

        $this->merge([
            'userId' => strip_tags(trim((string) $this->input('userId', ''))),
            'history' => $sanitizedHistory,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'userId' => ['required', 'string', 'max:128'],
            'history' => ['required', 'array', 'min:1', 'max:50'],
            'history.*.role' => ['required', 'string', 'in:user,model'],
            'history.*.text' => ['required', 'string', 'max:4000'],
        ];
    }

    public function toDto(): ChatbotQueryDto
    {
        /** @var list<array{role: string, text: string}> $history */
        $history = $this->validated('history');

        return new ChatbotQueryDto(
            userId: (string) $this->validated('userId'),
            query: self::extractLatestUserMessage($history),
        );
    }

    /**
     * @param  list<array{role: string, text: string}>  $history
     */
    private static function extractLatestUserMessage(array $history): string
    {
        for ($i = count($history) - 1; $i >= 0; $i--) {
            if (($history[$i]['role'] ?? '') === 'user') {
                return trim((string) ($history[$i]['text'] ?? ''));
            }
        }

        return '';
    }

    protected function failedAuthorization(): void
    {
        throw new HttpResponseException(
            response()->json(['message' => 'Acción no autorizada.'], 403)
        );
    }

    protected function failedValidation(Validator $validator): void
    {
        Log::error('ChatbotMessageRequest: validación fallida', [
            'errors' => $validator->errors()->toArray(),
        ]);

        throw new HttpResponseException(
            response()->json(['message' => 'Fallo en la validación de la solicitud.'], 422)
        );
    }
}
