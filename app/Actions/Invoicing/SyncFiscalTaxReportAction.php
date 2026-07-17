<?php

declare(strict_types=1);

namespace App\Actions\Invoicing;

use App\Contracts\Invoicing\FiscalInvoiceIssuerInterface;
use App\Enums\FiscalInvoiceStatus;
use App\Models\FiscalInvoice;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Sondea el tax_report de B2BRouter y actualiza la factura fiscal cuando llega
 * a un estado terminal (registered/error). Nunca revierte el pago Stripe.
 *
 * Los fallos de red al consultar el tax_report son transitorios: se registran
 * en log y se deja la factura en 'processing' para el siguiente sondeo.
 */
final class SyncFiscalTaxReportAction
{
    public function __construct(
        private readonly FiscalInvoiceIssuerInterface $issuer,
    ) {}

    public function execute(FiscalInvoice $invoice): FiscalInvoice
    {
        if ($invoice->status !== FiscalInvoiceStatus::Processing || $invoice->b2b_tax_report_id === null) {
            return $invoice;
        }

        try {
            $report = $this->issuer->getTaxReport($invoice->b2b_tax_report_id);
        } catch (Throwable $e) {
            Log::warning('SyncFiscalTaxReportAction: fallo transitorio al consultar tax_report', [
                'fiscal_invoice_id' => $invoice->id,
                'b2b_tax_report_id' => $invoice->b2b_tax_report_id,
                'error'             => $e->getMessage(),
            ]);

            return $invoice;
        }

        if ($report->isRegistered()) {
            return $this->persist($invoice, [
                'status'          => FiscalInvoiceStatus::Registered,
                'tbai_identifier' => $report->identifier,
                'qr_payload'      => $report->qr,
                'issued_at'       => now(),
            ]);
        }

        if ($report->isError()) {
            return $this->persist($invoice, [
                'status'     => FiscalInvoiceStatus::Failed,
                'last_error' => $report->errorMessage ?? 'TicketBAI rechazado por la Hacienda Foral.',
            ]);
        }

        return $invoice; // estado intermedio (processing/signed): se reintenta en el siguiente sondeo
    }

    /** @param array<string, mixed> $attributes */
    private function persist(FiscalInvoice $invoice, array $attributes): FiscalInvoice
    {
        return DB::transaction(function () use ($invoice, $attributes): FiscalInvoice {
            $fresh = FiscalInvoice::query()->whereKey($invoice->id)->lockForUpdate()->first() ?? $invoice;
            $fresh->update($attributes);

            return $fresh;
        });
    }
}
