<?php

namespace App\Http\Requests\Admin;

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
            // El mostrador tampoco reserva tablas retiradas: si hay que alquilar
            // una, primero se reactiva en Admin → Tablas (decisión explícita).
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
            'surfboard_id.exists' => 'Esta tabla está retirada del alquiler: actívala antes de reservarla.',
        ];
    }
}
