<?php

namespace App\Http\Requests\Admin;

use App\Models\Surfboard;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSurfboardRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'price_schema_id' => ['required', 'integer', 'exists:price_schemas,id'],
            'category' => ['required', 'string', Rule::in([Surfboard::CATEGORY_HARD, Surfboard::CATEGORY_SOFT])],
            'is_active' => ['boolean'],
            'name' => ['nullable', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:120'],
            'description' => ['nullable', 'string'],
            'image_url' => ['nullable', 'string'], // JSON o path (fallback)
            'image_alt' => ['nullable', 'string', 'max:255'],
            'image' => ['nullable', 'file', 'image', 'max:5120'], // 5MB
        ];
    }
}
