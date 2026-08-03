<?php

namespace App\Http\Requests\Rentals;

use App\Http\Requests\Concerns\ResolvesRentalWindow;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreBookingRequest extends FormRequest
{
    use ResolvesRentalWindow;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // Solo tablas en alquiler: una inactiva no se oferta ni por id directo.
            'surfboard_id' => ['required', 'integer', Rule::exists('surfboards', 'id')->where('is_active', true)],
            'client_name' => ['required', 'string', 'max:255'],
            'client_email' => ['nullable', 'email', 'max:255'],
            'client_phone' => ['nullable', 'string', 'max:50'],
            'start_date' => ['required', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'payment_method' => ['nullable', 'in:card,bizum,transferencia'],
            ...$this->rentalWindowRules(),
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'surfboard_id.exists' => 'Esta tabla no está disponible para alquiler.',
        ];
    }
}
