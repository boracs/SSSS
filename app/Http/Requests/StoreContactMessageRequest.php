<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class StoreContactMessageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Sanitiza los campos reales antes de validar:
     * strip_tags elimina XSS; filter_var normaliza el email.
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'name'    => strip_tags(trim((string) $this->input('name', ''))),
            'email'   => filter_var(
                strtolower(trim((string) $this->input('email', ''))),
                FILTER_SANITIZE_EMAIL
            ) ?: '',
            'message' => strip_tags(trim((string) $this->input('message', ''))),
        ]);
    }

    public function rules(): array
    {
        return [
            'name'    => ['required', 'string', 'min:2', 'max:80', 'regex:/^[\pL\s\'\-]+$/u'],
            'email'   => ['required', 'string', 'email:rfc,dns', 'max:150'],
            'message' => ['required', 'string', 'min:10', 'max:2000'],
            // Honeypot: debe estar presente y vacío; cualquier valor delata un bot.
            'website' => ['present', 'max:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required'    => 'El nombre es obligatorio.',
            'name.min'         => 'El nombre debe tener al menos 2 caracteres.',
            'name.max'         => 'El nombre no puede superar 80 caracteres.',
            'name.regex'       => 'El nombre contiene caracteres no permitidos.',
            'email.required'   => 'El correo es obligatorio.',
            'email.email'      => 'Introduce un correo electrónico válido.',
            'message.required' => 'El mensaje es obligatorio.',
            'message.min'      => 'El mensaje debe tener al menos 10 caracteres.',
            'message.max'      => 'El mensaje no puede superar 2000 caracteres.',
            'website.max'      => 'No se pudo validar el formulario.',
        ];
    }

    /**
     * Si el honeypot 'website' contiene datos, devolvemos una respuesta de
     * éxito falsa para no revelar al bot que ha sido detectado.
     * Para errores reales (nombre, email, mensaje) usamos el flujo normal.
     */
    protected function failedValidation(Validator $validator): never
    {
        if ($validator->errors()->has('website')) {
            throw new HttpResponseException(
                redirect()->back()
                    ->with('success', 'Mensaje enviado correctamente. Te responderemos pronto.')
            );
        }

        parent::failedValidation($validator);
    }
}
