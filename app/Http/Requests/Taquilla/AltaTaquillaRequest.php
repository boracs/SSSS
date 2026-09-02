<?php

declare(strict_types=1);

namespace App\Http\Requests\Taquilla;

use Illuminate\Foundation\Http\FormRequest;

class AltaTaquillaRequest extends FormRequest
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
            'numero_taquilla' => ['required', 'integer', 'min:1', 'max:9999'],
            'alta_el' => ['nullable', 'date', 'after_or_equal:today'],
        ];
    }
}
