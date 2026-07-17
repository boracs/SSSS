<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Enums\AuctionCategory;
use App\Enums\AuctionStatus;
use App\Support\MoneyCents;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAuctionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'admin';
    }

    protected function prepareForValidation(): void
    {
        $merge = [];

        if ($this->has('description')) {
            $merge['description'] = strip_tags((string) $this->input('description', ''));
        }

        foreach (['starting_price', 'min_increment', 'reserve_price'] as $field) {
            if ($this->has($field) && $this->input($field) !== null && $this->input($field) !== '') {
                $merge[$field.'_cents'] = MoneyCents::eurosToCents((float) $this->input($field));
            }
        }

        if ($merge !== []) {
            $this->merge($merge);
        }
    }

    public function rules(): array
    {
        return [
            'title'                 => ['required', 'string', 'max:160'],
            'description'           => ['nullable', 'string', 'max:4000'],
            'category'              => ['required', Rule::enum(AuctionCategory::class)],
            'starting_price'        => ['required', 'numeric', 'min:1'],
            'starting_price_cents'  => ['required', 'integer', 'min:100'],
            'min_increment'         => ['nullable', 'numeric', 'min:1'],
            'min_increment_cents'   => ['nullable', 'integer', 'min:100'],
            'reserve_price'         => ['nullable', 'numeric', 'min:0'],
            'reserve_price_cents'   => ['nullable', 'integer', 'min:0'],
            'status'                => ['required', Rule::enum(AuctionStatus::class)],
            'starts_at'             => ['nullable', 'date'],
            'ends_at'               => ['nullable', 'date'],
            'images.*'              => ['nullable', 'image', 'mimes:jpeg,jpg,png,webp', 'max:5120'],
        ];
    }
}
