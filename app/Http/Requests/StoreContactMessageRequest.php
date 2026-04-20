<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreContactMessageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $name = trim((string) $this->input('name', ''));
        $email = strtolower(trim((string) $this->input('email', '')));
        $message = trim((string) $this->input('message', ''));

        $this->merge([
            'name' => strip_tags($name),
            'email' => filter_var($email, FILTER_SANITIZE_EMAIL) ?: '',
            'message' => strip_tags($message),
        ]);
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:2', 'max:80', 'regex:/^[\pL\s\'-]+$/u'],
            'email' => ['required', 'string', 'email:rfc,dns', 'max:150'],
            'message' => ['required', 'string', 'min:10', 'max:2000'],
            'website' => ['nullable', 'string', 'max:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'El nombre es obligatorio.',
            'name.min' => 'El nombre debe tener al menos 2 caracteres.',
            'name.max' => 'El nombre no puede superar 80 caracteres.',
            'name.regex' => 'El nombre contiene caracteres no permitidos.',
            'email.required' => 'El correo es obligatorio.',
            'email.email' => 'Introduce un correo electrónico válido.',
            'message.required' => 'El mensaje es obligatorio.',
            'message.min' => 'El mensaje debe tener al menos 10 caracteres.',
            'message.max' => 'El mensaje no puede superar 2000 caracteres.',
            'website.max' => 'No se pudo validar el formulario.',
        ];
    }
}
