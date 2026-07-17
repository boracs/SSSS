<?php

declare(strict_types=1);

namespace App\Http\Requests\Auctions;

use App\Support\MoneyCents;
use Illuminate\Foundation\Http\FormRequest;

class PlaceBidRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('amount') && $this->input('amount') !== null && $this->input('amount') !== '') {
            $normalized = str_replace(',', '.', (string) $this->input('amount'));
            $this->merge([
                'amount'       => $normalized,
                'amount_cents' => MoneyCents::eurosToCents((float) $normalized),
            ]);
        }
    }

    public function rules(): array
    {
        return [
            'amount'       => ['required', 'numeric', 'min:0.01'],
            'amount_cents' => ['required', 'integer', 'min:1'],
        ];
    }

    public function withValidator(\Illuminate\Validation\Validator $validator): void
    {
        $validator->after(function (\Illuminate\Validation\Validator $validator): void {
            /** @var \App\Models\Auction|null $auction */
            $auction = $this->route('auction');

            if ($auction === null || $validator->errors()->has('amount') || $validator->errors()->has('amount_cents')) {
                return;
            }

            $minimum = $auction->fresh()?->minimumNextBidCents() ?? $auction->minimumNextBidCents();

            if ((int) $this->input('amount_cents') < $minimum) {
                $validator->errors()->add(
                    'amount',
                    'La puja mínima actual es de '.number_format($minimum / 100, 2, ',', '.').' €.',
                );
            }
        });
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'amount.required' => 'Indica el importe de tu puja.',
            'amount.numeric'  => 'El importe debe ser un número válido.',
            'amount.min'      => 'El importe debe ser mayor que cero.',
        ];
    }
}
