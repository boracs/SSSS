<?php

declare(strict_types=1);

namespace App\DTOs\Rentals;

/**
 * Entrada cruda de una petición de alquiler, ya validada por el FormRequest.
 * BookingService la convierte en {@see RentalWindowDto}.
 */
final readonly class RentalRequestDto
{
    public function __construct(
        public string $startDate,
        public ?string $endDate = null,
        public ?string $mode = null,
        public ?int $packMinutes = null,
        public ?int $packDays = null,
    ) {}
}
