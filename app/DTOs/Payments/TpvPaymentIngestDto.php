<?php

declare(strict_types=1);

namespace App\DTOs\Payments;

use InvalidArgumentException;

/**
 * Payload canónico normalizado de un cobro TPV entrante (ingesta firmada HMAC).
 * No representa el formato propietario de ningún banco: es el contrato interno
 * al que debe traducirse cualquier adapter de TPV (Kutxabank u otro) antes de llegar aquí.
 */
final readonly class TpvPaymentIngestDto
{
    public function __construct(
        public int $amountCents,
        public string $paidAt,
        public string $externalReference,
        public ?string $terminalCodigo,
        public ?string $notes,
        public array $rawPayload,
    ) {
        if ($this->amountCents <= 0) {
            throw new InvalidArgumentException('amount_cents es obligatorio y debe ser mayor que 0.');
        }

        if (trim($this->paidAt) === '') {
            throw new InvalidArgumentException('paid_at es obligatorio.');
        }

        if (trim($this->externalReference) === '') {
            throw new InvalidArgumentException('external_reference es obligatorio.');
        }
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public static function fromArray(array $payload): self
    {
        $amountCents = $payload['amount_cents'] ?? null;
        if (! is_int($amountCents) && ! (is_string($amountCents) && ctype_digit($amountCents))) {
            throw new InvalidArgumentException('amount_cents es obligatorio y debe ser un entero.');
        }

        $paidAt = $payload['paid_at'] ?? null;
        if (! is_string($paidAt) || trim($paidAt) === '') {
            throw new InvalidArgumentException('paid_at es obligatorio.');
        }

        $externalReference = $payload['external_reference'] ?? null;
        if (! is_string($externalReference) || trim($externalReference) === '') {
            throw new InvalidArgumentException('external_reference es obligatorio.');
        }

        $terminalCodigo = $payload['terminal_codigo'] ?? null;
        $notes = $payload['notes'] ?? null;

        return new self(
            amountCents: (int) $amountCents,
            paidAt: $paidAt,
            externalReference: $externalReference,
            terminalCodigo: is_string($terminalCodigo) && trim($terminalCodigo) !== '' ? $terminalCodigo : null,
            notes: is_string($notes) && trim($notes) !== '' ? $notes : null,
            rawPayload: $payload,
        );
    }
}
