<?php

declare(strict_types=1);

namespace App\Http\Requests\Taquilla;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePagoTaquillaCheckedStateRequest extends FormRequest
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
            'is_checked' => ['required', 'boolean'],
        ];
    }
}
