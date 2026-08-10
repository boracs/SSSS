<?php

declare(strict_types=1);

namespace App\DTOs\Payments;

use InvalidArgumentException;

final readonly class MostradorTicketLineDto
{
    /**
     * @param  array<string, mixed>  $payload
     */
    public function __construct(
        public string $category,
        public int $amountCents,
        public array $payload,
    ) {
        if (! in_array($this->category, [
            'taquilla', 'bono', 'alquiler', 'clase', 'fotos', 'producto',
        ], true)) {
            throw new InvalidArgumentException('Categoría de línea no válida.');
        }

        if ($this->amountCents <= 0) {
            throw new InvalidArgumentException('amount_cents de línea debe ser > 0.');
        }
    }

    /**
     * @param  array<string, mixed>  $row
     */
    public static function fromArray(array $row): self
    {
        $category = (string) ($row['category'] ?? '');
        $amount = $row['amount_cents'] ?? null;
        if (! is_int($amount) && ! (is_string($amount) && ctype_digit($amount))) {
            throw new InvalidArgumentException('amount_cents de línea inválido.');
        }

        $payload = $row['payload'] ?? $row;
        if (! is_array($payload)) {
            $payload = [];
        }

        // Campos de orquestación fuera del payload de dominio.
        unset(
            $payload['category'],
            $payload['amount_cents'],
            $payload['payload'],
            $payload['user_id'],
            $payload['guest_name'],
            $payload['guest_email'],
            $payload['force_amount_mismatch'],
            $payload['notes'],
            $payload['reviewed_by'],
        );

        return new self(
            category: $category,
            amountCents: (int) $amount,
            payload: $payload,
        );
    }
}
