<?php

declare(strict_types=1);

namespace App\DTOs\Taquilla;

readonly class LockerOccupantDto
{
    public function __construct(
        public int $number,
        public string $nombre,
        public string $apellido,
        public string $email = '',
        public string $telefono = '',
        /** Días de retraso de cuota de taquilla (>0 = debe días). */
        public int $diasDeuda = 0,
    ) {}

    /**
     * @return array{number: int, nombre: string, apellido: string, email: string, telefono: string, dias_deuda: int}
     */
    public function toArray(): array
    {
        return [
            'number' => $this->number,
            'nombre' => $this->nombre,
            'apellido' => $this->apellido,
            'email' => $this->email,
            'telefono' => $this->telefono,
            'dias_deuda' => $this->diasDeuda,
        ];
    }
}
