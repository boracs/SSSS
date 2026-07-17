<?php

declare(strict_types=1);

namespace App\DTOs\Invoicing;

/**
 * Resultado de crear una factura emitida en B2BRouter (send_after_import=true).
 */
final readonly class FiscalInvoiceResultDto
{
    /**
     * @param  list<string>  $taxReportIds
     */
    public function __construct(
        public string $b2bInvoiceId,
        public array $taxReportIds,
        public string $rawState,
    ) {}

    public function firstTaxReportId(): ?string
    {
        return $this->taxReportIds[0] ?? null;
    }
}
