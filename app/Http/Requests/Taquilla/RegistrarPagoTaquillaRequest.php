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
            'plan_id' => ['required', 'integer', 'exists:planes_taquilla,id'],
            'monto_pagado' => ['nullable', 'numeric', 'min:0'],
            'referencia_pago_externa' => ['nullable', 'string', 'max:255'],
            'proof' => ['required', 'file', 'mimes:jpeg,jpg,png,pdf', 'max:10240'],
            'payment_method' => ['nullable', 'in:bizum,transferencia'],
        ];
    }
}
