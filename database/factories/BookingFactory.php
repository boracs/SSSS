<?php

declare(strict_types=1);

namespace Database\Factories;

use App\DTOs\Rentals\RentalWindowDto;
use App\Models\Booking;
use App\Models\PriceSchema;
use App\Models\Surfboard;
use App\Support\BusinessDateTime;
use DateTimeInterface;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Carbon;

/**
 * Reservas de alquiler con ventana completa (cobrada + inventario).
 *
 * El buffer se calcula aquí a mano en vez de llamar a BookingService: así los
 * tests de disponibilidad no dependen del mismo código que quieren fijar.
 *
 * @extends Factory<Booking>
 */
class BookingFactory extends Factory
{
    protected $model = Booking::class;

    public function definition(): array
    {
        $pickup = BusinessDateTime::now()->addDay()->setTime(10, 0, 0);

        return array_merge([
            'surfboard_id' => Surfboard::factory(),
            'user_id' => null,
            'client_name' => $this->faker->name(),
            'client_email' => $this->faker->safeEmail(),
            'status' => Booking::STATUS_PENDING,
            'payment_status' => Booking::PAYMENT_PENDING,
            'total_price' => 16,
            'deposit_amount' => 4.8,
            'expires_at' => BusinessDateTime::now()->addDays(7),
        ], $this->windowAttributes($pickup, 120, RentalWindowDto::MODE_HOUR, 120, null));
    }

    /** Alquiler por horas: recogida concreta + pack de minutos. */
    public function hourWindow(DateTimeInterface $pickupAt, int $packMinutes = 120): static
    {
        return $this->state(fn () => $this->windowAttributes(
            Carbon::instance($pickupAt),
            $packMinutes,
            RentalWindowDto::MODE_HOUR,
            $packMinutes,
            null,
        ));
    }

    /** Alquiler por días: ciclo 12:00 → 12:00 del día indicado. */
    public function dayWindow(DateTimeInterface $startDay, int $days = 1): static
    {
        $hour = (int) config('rentals.day_mode_pickup_hour', 12);
        $pickup = Carbon::instance($startDay)
            ->timezone(BusinessDateTime::businessTimezone())
            ->setTime($hour, 0, 0);

        return $this->state(fn () => $this->windowAttributes(
            $pickup,
            $days * PriceSchema::MINUTES_PER_DAY,
            RentalWindowDto::MODE_DAY,
            null,
            array_key_exists($days, PriceSchema::DAY_PACKS) ? $days : null,
        ));
    }

    public function cancelled(): static
    {
        return $this->state(fn () => ['status' => Booking::STATUS_CANCELLED]);
    }

    /** Señal del 30 % cobrada: el alquiler NO está pagado entero. */
    public function depositPaid(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => Booking::STATUS_CONFIRMED,
            'payment_status' => Booking::PAYMENT_CONFIRMED,
            'deposit_amount' => round(((float) $attributes['total_price']) * 0.3, 2),
        ]);
    }

    /** Alquiler prepagado al 100 % (deposit_amount == total_price). */
    public function fullyPaid(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => Booking::STATUS_CONFIRMED,
            'payment_status' => Booking::PAYMENT_CONFIRMED,
            'deposit_amount' => (float) $attributes['total_price'],
        ]);
    }

    public function pickedUpAt(DateTimeInterface $at): static
    {
        return $this->state(fn () => ['picked_up_at' => Carbon::instance($at)]);
    }

    /**
     * @return array<string, mixed>
     */
    private function windowAttributes(
        Carbon $pickup,
        int $chargedMinutes,
        string $mode,
        ?int $packMinutes,
        ?int $packDays,
    ): array {
        $pickup = $pickup->copy()->timezone(BusinessDateTime::businessTimezone())->seconds(0);
        $return = $pickup->copy()->addMinutes($chargedMinutes);
        $buffer = max(0, (int) config('rentals.turnover_buffer_minutes', 30));

        return [
            'mode' => $mode,
            'start_date' => $pickup,
            'end_date' => $return,
            'pickup_at' => $pickup,
            'return_at' => $return,
            'block_end' => $return->copy()->addMinutes($buffer),
            'pack_minutes' => $packMinutes,
            'pack_days' => $packDays,
        ];
    }
}
