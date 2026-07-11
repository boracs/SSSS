<?php

declare(strict_types=1);

namespace App\Http\Requests\Taquilla;

use Illuminate\Foundation\Http\FormRequest;

class RegistrarPagoTaquillaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'plan_id'                 => ['required', 'integer', 'exists:planes_taquilla,id'],
            'referencia_pago_externa' => ['nullable', 'string', 'max:255'],
        ];
    }
}
