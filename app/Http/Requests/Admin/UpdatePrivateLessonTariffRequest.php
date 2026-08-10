<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePrivateLessonTariffRequest extends FormRequest
{
    public function authorize(): bool
    {
        return ($this->user()?->role ?? '') === 'admin';
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'tariffs' => ['required', 'array', 'min:1', 'max:12'],
            'tariffs.*.people' => ['required', 'integer', 'min:1', 'max:12'],
            'tariffs.*.price_eur' => ['required', 'numeric', 'min:0', 'max:5000'],
            'tariffs.*.activo' => ['nullable', 'boolean'],
        ];
    }

    /**
     * @return list<array{people: int, price_eur: float, activo: bool}>
     */
    public function tariffRows(): array
    {
        $rows = [];

        foreach ((array) $this->validated('tariffs') as $row) {
            $rows[] = [
                'people' => (int) $row['people'],
                'price_eur' => (float) $row['price_eur'],
                'activo' => (bool) ($row['activo'] ?? true),
            ];
        }

        return $rows;
    }
}
