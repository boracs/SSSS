<?php

declare(strict_types=1);

namespace App\Http\Requests\Taquilla;

use Illuminate\Foundation\Http\FormRequest;

class SubirJustificanteTaquillaRequest extends FormRequest
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
            'proof' => ['required', 'file', 'mimes:jpeg,jpg,png,pdf', 'max:10240'],
            'payment_method' => ['nullable', 'in:bizum,transferencia,tienda'],
        ];
    }
}
