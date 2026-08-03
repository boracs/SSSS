<?php

declare(strict_types=1);

namespace App\Http\Requests\Concerns;

use App\DTOs\Rentals\RentalRequestDto;
use App\DTOs\Rentals\RentalWindowDto;
use App\Models\PriceSchema;

/**
 * Reglas comunes del contrato de alquiler (público y admin).
 * `pickup_at`, `mode`, `pack_minutes` y `pack_days` son opcionales: sin ellos se
 * asume modo día y la duración se deriva de start_date/end_date (legacy).
 * `return_at` y `block_end` NUNCA llegan del cliente: los calcula BookingService
 * a partir del pack, para que nadie pueda alargar el alquiler sin pagarlo.
 */
trait ResolvesRentalWindow
{
    /**
     * @return array<string, array<int, mixed>>
     */
    protected function rentalWindowRules(): array
    {
        return [
            // Recogida real (ISO con hora). Manda sobre start_date cuando viaja.
            'pickup_at' => ['nullable', 'date'],
            'mode' => ['nullable', 'string', 'in:'.RentalWindowDto::MODE_HOUR.','.RentalWindowDto::MODE_DAY],
            'pack_minutes' => ['nullable', 'integer', 'in:'.implode(',', array_keys(PriceSchema::MINUTE_PACKS))],
            'pack_days' => ['nullable', 'integer', 'in:'.implode(',', array_keys(PriceSchema::DAY_PACKS))],
        ];
    }

    public function toRentalRequest(): RentalRequestDto
    {
        $validated = $this->validated();

        $pickupAt = isset($validated['pickup_at']) && $validated['pickup_at'] !== ''
            ? (string) $validated['pickup_at']
            : null;

        return new RentalRequestDto(
            startDate: $pickupAt ?? (string) $validated['start_date'],
            endDate: isset($validated['end_date']) ? (string) $validated['end_date'] : null,
            mode: isset($validated['mode']) && $validated['mode'] !== '' ? (string) $validated['mode'] : null,
            packMinutes: isset($validated['pack_minutes']) ? (int) $validated['pack_minutes'] : null,
            packDays: isset($validated['pack_days']) ? (int) $validated['pack_days'] : null,
        );
    }
}
