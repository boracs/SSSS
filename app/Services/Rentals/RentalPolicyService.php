<?php

declare(strict_types=1);

namespace App\Services\Rentals;

use App\DTOs\Rentals\RentalPolicyDto;

/**
 * Lee config/rentals.php y lo expone como contrato único para la UI pública
 * (tabla de tarifas, selector de recogida) y para los textos de condiciones.
 */
final class RentalPolicyService
{
    public function current(): RentalPolicyDto
    {
        $buffer = max(0, (int) config('rentals.turnover_buffer_minutes', 30));
        $flexibility = max(0, (int) config('rentals.pickup_flexibility_minutes', 30));
        $dayHour = max(0, min(23, (int) config('rentals.day_mode_pickup_hour', 12)));

        return new RentalPolicyDto(
            turnoverBufferMinutes: $buffer,
            pickupFlexibilityMinutes: $flexibility,
            dayModePickupHour: $dayHour,
            pickupWindowStart: $this->time('rentals.pickup_window_start', '09:00'),
            pickupWindowEnd: $this->time('rentals.pickup_window_end', '19:00'),
            pickupSlotStepMinutes: max(5, (int) config('rentals.pickup_slot_step_minutes', 30)),
            notes: $this->notes($dayHour, $flexibility, $buffer),
        );
    }

    /**
     * Condiciones reales del alquiler; mismo texto en tabla de tarifas y reserva.
     * El buffer de rotación (inventario) no se comunica al cliente: es operativo.
     *
     * @return list<string>
     */
    private function notes(int $dayHour, int $flexibility, int $buffer): array
    {
        $noon = sprintf('%02d:00', $dayHour);
        $courtesy = $flexibility > 0 ? $flexibility : $buffer;

        return [
            "Los alquileres por días son de {$noon} a {$noon}.",
            "Te damos {$courtesy} minutos de cortesía ante posibles retrasos (no se cobran).",
            'En alquiler por horas, una vez recogida la tabla empieza a contar el tiempo del pack hasta la hora de devolución acordada.',
        ];
    }

    private function time(string $key, string $default): string
    {
        $raw = trim((string) config($key, $default));

        if (preg_match('/^(\d{1,2}):(\d{2})$/', $raw, $m) !== 1) {
            return $default;
        }

        $hour = min(23, max(0, (int) $m[1]));
        $minute = min(59, max(0, (int) $m[2]));

        return sprintf('%02d:%02d', $hour, $minute);
    }
}
