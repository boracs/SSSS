<?php

declare(strict_types=1);

namespace App\Http\Requests\Chatbot;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

final class RegisterChatbotContactPhoneRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'phone' => strip_tags(trim((string) $this->input('phone', ''))),
            'sessionToken' => strip_tags(trim((string) $this->input('sessionToken', ''))) ?: null,
            'caseReference' => strip_tags(trim((string) $this->input('caseReference', ''))) ?: null,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'phone' => ['required', 'string', 'min:9', 'max:20'],
            'sessionToken' => ['nullable', 'string', 'max:64'],
            'caseReference' => ['nullable', 'string', 'regex:/^S4-\d{6}$/'],
        ];
    }

    protected function failedValidation(Validator $validator): void
    {
        throw new HttpResponseException(
            response()->json(['success' => false, 'message' => 'Teléfono no válido.'], 422)
        );
    }
}
