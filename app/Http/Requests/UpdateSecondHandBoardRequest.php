<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\SecondHandStatus;
use App\Enums\SecondHandBoardType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSecondHandBoardRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'admin';
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('description')) {
            $this->merge(['description' => strip_tags((string) $this->input('description', ''))]);
        }
    }

    public function rules(): array
    {
        return [
            'name'          => ['sometimes', 'required', 'string', 'max:120'],
            'brand'         => ['nullable', 'string', 'max:80'],
            'model'         => ['sometimes', 'nullable', 'string', 'max:100'],
            'board_type'    => ['sometimes', 'nullable', Rule::enum(SecondHandBoardType::class)],
            'description'   => ['nullable', 'string', 'max:2000'],
            'height'        => ['sometimes', 'required', 'numeric', 'min:0.1', 'max:15'],
            'width'         => ['sometimes', 'required', 'numeric', 'min:0.1', 'max:60'],
            'thickness'     => ['sometimes', 'required', 'numeric', 'min:0.1', 'max:10'],
            'volume'        => ['sometimes', 'required', 'numeric', 'min:0.1', 'max:200'],
            'purchase_price'=> ['sometimes', 'required', 'integer', 'min:0'],
            'sale_price'    => ['sometimes', 'required', 'integer', 'min:1'],
            'discount_pct'  => ['nullable', 'integer', 'min:0', 'max:100'],
            'status'        => ['sometimes', 'required', Rule::enum(SecondHandStatus::class)],
            'images.*'      => ['nullable', 'image', 'mimes:jpeg,jpg,png,webp', 'max:5120'],
            'purchased_at'  => ['nullable', 'date'],
            'sold_at'       => ['nullable', 'date'],
        ];
    }
}
