<?php

declare(strict_types=1);

namespace App\DTOs\Rentals;

/**
 * Condiciones operativas del alquiler que la UI necesita conocer para ofrecer
 * horas de recogida coherentes con BookingService (buffer, mediodía, horario).
 */
final readonly class RentalPolicyDto
{
    /**
     * @param  string  $pickupWindowStart  'HH:MM' de apertura de mostrador
     * @param  string  $pickupWindowEnd    'HH:MM' de cierre: la devolución cobrada debe caber antes
     * @param  list<string>  $notes
     */
    public function __construct(
        public int $turnoverBufferMinutes,
        public int $pickupFlexibilityMinutes,
        public int $dayModePickupHour,
        public string $pickupWindowStart,
        public string $pickupWindowEnd,
        public int $pickupSlotStepMinutes,
        public array $notes,
    ) {}

    /**
     * @return array{
     *     turnover_buffer_minutes: int,
     *     pickup_flexibility_minutes: int,
     *     day_mode_pickup_hour: int,
     *     pickup_window_start: string,
     *     pickup_window_end: string,
     *     pickup_slot_step_minutes: int,
     *     notes: list<string>
     * }
     */
    public function toArray(): array
    {
        return [
            'turnover_buffer_minutes' => $this->turnoverBufferMinutes,
            'pickup_flexibility_minutes' => $this->pickupFlexibilityMinutes,
            'day_mode_pickup_hour' => $this->dayModePickupHour,
            'pickup_window_start' => $this->pickupWindowStart,
            'pickup_window_end' => $this->pickupWindowEnd,
            'pickup_slot_step_minutes' => $this->pickupSlotStepMinutes,
            'notes' => $this->notes,
        ];
    }
}
