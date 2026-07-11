<?php

declare(strict_types=1);

namespace App\Http\Requests\Chatbot;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Memoria LTP desactivada; se mantiene el contrato API por compatibilidad frontend.
 */
final class ChatbotArtifactRequest extends FormRequest
{
    public function authorize(): bool
    {
        if (! auth()->check()) {
            return true;
        }

        return (string) $this->input('userId', '') === (string) auth()->id();
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'userId' => strip_tags(trim((string) $this->input('userId', ''))),
            'latestUserMessage' => strip_tags(trim((string) $this->input('latestUserMessage', ''))),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'userId' => ['required', 'string', 'max:128'],
            'latestUserMessage' => ['required', 'string', 'max:2000'],
        ];
    }
}
