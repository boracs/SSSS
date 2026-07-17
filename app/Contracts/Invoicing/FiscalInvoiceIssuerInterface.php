<?php

declare(strict_types=1);

namespace App\Contracts\Invoicing;

use App\DTOs\Invoicing\FiscalInvoiceDraftDto;
use App\DTOs\Invoicing\FiscalInvoiceResultDto;
use App\DTOs\Invoicing\FiscalTaxReportStatusDto;

/**
 * Puerto de facturación fiscal. Implementación por defecto: B2BRouterFiscalInvoiceIssuer.
 * Cualquier proveedor TicketBAI/Verifactu alternativo debe implementar este contrato
 * y registrarse en AppServiceProvider según config('invoicing.driver').
 */
interface FiscalInvoiceIssuerInterface
{
    /**
     * Crea y emite la factura (send_after_import=true en B2BRouter): el proveedor
     * genera, firma, encadena y envía el TicketBAI a la Hacienda Foral correspondiente.
     */
    public function createIssuedInvoice(FiscalInvoiceDraftDto $draft): FiscalInvoiceResultDto;

    /**
     * Consulta el estado de tramitación del tax_report asociado a una factura ya creada.
     */
    public function getTaxReport(string $taxReportId): FiscalTaxReportStatusDto;

    /**
     * Descarga el PDF de una factura ya emitida en el proveedor (binario).
     */
    public function downloadInvoicePdf(string $providerInvoiceId): string;
}
