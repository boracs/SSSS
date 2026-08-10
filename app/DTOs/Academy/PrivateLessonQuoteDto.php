<?php

declare(strict_types=1);

namespace App\DTOs\Academy;

/**
 * Presupuesto de una clase particular: total del grupo y señal a cobrar online.
 * Todos los importes en céntimos.
 */
final readonly class PrivateLessonQuoteDto
{
    public function __construct(
        public int $people,
        public int $durationMinutes,
        public int $baseTariffCents,
        public int $totalCents,
        public int $depositCents,
    ) {}

    public function remainingCents(): int
    {
        return max(0, $this->totalCents - $this->depositCents);
    }
}
