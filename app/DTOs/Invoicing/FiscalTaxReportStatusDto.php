<?php

declare(strict_types=1);

namespace App\DTOs\Invoicing;

/**
 * Estado de un tax_report de B2BRouter (sondeo asíncrono tras crear la factura).
 * `state` esperado: processing | signed | registered | error (ver docs B2BRouter TicketBAI).
 */
final readonly class FiscalTaxReportStatusDto
{
    public function __construct(
        public string $id,
        public string $state,
        public ?string $identifier = null,
        public ?string $qr = null,
        public ?string $errorMessage = null,
    ) {}

    public function isRegistered(): bool
    {
        return $this->state === 'registered';
    }

    public function isError(): bool
    {
        return $this->state === 'error';
    }
}
