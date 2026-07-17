<?php

declare(strict_types=1);

namespace App\DTOs\Invoicing;

use InvalidArgumentException;

/**
 * Línea de factura fiscal. El precio SIEMPRE en céntimos (int); la conversión a euros
 * solo ocurre en el client del proveedor (ver B2BRouterFiscalInvoiceIssuer).
 */
final readonly class FiscalInvoiceLineDto
{
    public function __construct(
        public string $description,
        public float $quantity,
        public int $unitPriceCents,
        public float $vatPercent,
        public string $vatCategory = 'S',
    ) {
        if ($this->description === '') {
            throw new InvalidArgumentException('La descripción de la línea de factura es obligatoria.');
        }

        if ($this->quantity <= 0) {
            throw new InvalidArgumentException('La cantidad debe ser mayor que cero.');
        }

        if ($this->unitPriceCents < 0) {
            throw new InvalidArgumentException('unitPriceCents no puede ser negativo.');
        }
    }

    public function totalCents(): int
    {
        return (int) round($this->unitPriceCents * $this->quantity);
    }
}
