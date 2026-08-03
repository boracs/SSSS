<?php

declare(strict_types=1);

namespace App\DTOs\Rentals;

use Illuminate\Support\Carbon;

/**
 * Ventana resuelta de un alquiler.
 *
 * - pickupAt  → returnAt : tiempo COBRADO (lo que ve y paga el cliente)
 * - pickupAt  → blockEnd : ventana de INVENTARIO (incluye buffer de rotación, no cobrado)
 */
final readonly class RentalWindowDto
{
    public const MODE_HOUR = 'hour';
    public const MODE_DAY = 'day';

    public function __construct(
        public string $mode,
        public Carbon $pickupAt,
        public Carbon $returnAt,
        public Carbon $blockEnd,
        public int $chargedMinutes,
        public ?int $packMinutes,
        public ?int $packDays,
        public int $bufferMinutes,
        public int $pickupFlexibilityMinutes,
    ) {}

    /** Inicio de la ventana de cortesía de recogida (pickup_at − flexibilidad). */
    public function pickupWindowStart(): Carbon
    {
        return $this->pickupAt->copy()->subMinutes($this->pickupFlexibilityMinutes);
    }

    /** Fin de la ventana de cortesía; a partir de aquí corre el margen de no-show. */
    public function pickupWindowEnd(): Carbon
    {
        return $this->pickupAt->copy()->addMinutes($this->pickupFlexibilityMinutes);
    }

    public function isDayMode(): bool
    {
        return $this->mode === self::MODE_DAY;
    }
}
