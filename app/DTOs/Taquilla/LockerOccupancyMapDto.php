<?php

declare(strict_types=1);

namespace App\DTOs\Taquilla;

readonly class LockerOccupancyMapDto
{
    /**
     * @param  list<LockerOccupantDto>  $occupants
     */
    public function __construct(
        public int $max,
        public array $occupants,
    ) {}

    /**
     * @return array{max: int, occupants: list<array{number: int, nombre: string, apellido: string, email: string, telefono: string, dias_deuda: int}>}
     */
    public function toArray(): array
    {
        return [
            'max' => $this->max,
            'occupants' => array_map(
                static fn (LockerOccupantDto $o): array => $o->toArray(),
                $this->occupants,
            ),
        ];
    }
}
