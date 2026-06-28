<?php

declare(strict_types=1);

namespace App\Http\Requests\Taquilla;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePlanTaquillaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null && (string) ($this->user()->role ?? '') === 'admin';
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'nombre' => ['required', 'string', 'max:100'],
            'precio_total' => ['required', 'numeric', 'min:0'],
            'duracion_meses' => ['required', 'integer', 'min:1', 'max:36'],
            'visible' => ['nullable', 'boolean'],
        ];
    }
}
