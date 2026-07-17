<?php

declare(strict_types=1);

namespace App\DTOs\Invoicing;

use InvalidArgumentException;

/**
 * Borrador de factura fiscal construido a partir de un payable confirmado.
 * Salida de FiscalInvoiceBuilderService; entrada de FiscalInvoiceIssuerInterface::createIssuedInvoice().
 */
final readonly class FiscalInvoiceDraftDto
{
    /**
     * @param  FiscalInvoiceLineDto[]  $lines
     */
    public function __construct(
        public string $payableType,
        public int $payableId,
        public string $stripeSessionId,
        public string $invoiceDate,
        public FiscalInvoiceContactDto $contact,
        public array $lines,
    ) {
        if ($this->payableType === '' || $this->payableId <= 0) {
            throw new InvalidArgumentException('payableType y payableId son obligatorios.');
        }

        if ($this->stripeSessionId === '') {
            throw new InvalidArgumentException('stripeSessionId es obligatorio.');
        }

        if ($this->lines === []) {
            throw new InvalidArgumentException('El borrador de factura debe tener al menos una línea.');
        }

        foreach ($this->lines as $index => $line) {
            if (! $line instanceof FiscalInvoiceLineDto) {
                throw new InvalidArgumentException("lines[{$index}] debe ser instancia de FiscalInvoiceLineDto.");
            }
        }
    }

    public function totalAmountCents(): int
    {
        return array_sum(array_map(
            static fn (FiscalInvoiceLineDto $line): int => $line->totalCents(),
            $this->lines,
        ));
    }
}
