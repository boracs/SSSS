<?php

declare(strict_types=1);

namespace App\Actions\Invoicing;

use App\Contracts\Invoicing\FiscalInvoiceIssuerInterface;
use App\DTOs\Invoicing\FiscalInvoiceResultDto;
use App\Enums\FiscalInvoiceStatus;
use App\Exceptions\Invoicing\MissingFiscalDataException;
use App\Exceptions\Invoicing\UnsupportedFiscalPayableException;
use App\Models\FiscalInvoice;
use App\Services\Invoicing\FiscalInvoiceBuilderService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Crea (idempotente) la factura fiscal en B2BRouter para un pago Stripe confirmado.
 *
 * Idempotencia: una única fila por stripe_checkout_session_id (UNIQUE en BD).
 * Una vez que b2b_invoice_id queda persistido, NUNCA se vuelve a llamar a
 * createIssuedInvoice() para esa fila — el resto del ciclo de vida (registered/
 * failed) lo resuelve SyncFiscalTaxReportAction sobre el tax_report ya creado.
 *
 * Las llamadas HTTP ocurren siempre fuera de cualquier lockForUpdate/transacción.
 */
final class IssueFiscalInvoiceAction
{
    public function __construct(
        private readonly FiscalInvoiceBuilderService $builder,
        private readonly FiscalInvoiceIssuerInterface $issuer,
    ) {}

    public function execute(string $payableType, int $payableId, int $amountCents, string $stripeSessionId): FiscalInvoice
    {
        $invoice = $this->getOrCreatePending($payableType, $payableId, $amountCents, $stripeSessionId);

        if ($invoice->b2b_invoice_id !== null) {
            return $invoice; // ya creada en B2BRouter; el sondeo se encarga del resto
        }

        try {
            $draft = $this->builder->build($payableType, $payableId, $amountCents, $stripeSessionId);
        } catch (MissingFiscalDataException|UnsupportedFiscalPayableException $e) {
            Log::warning('IssueFiscalInvoiceAction: datos insuficientes para facturar', [
                'fiscal_invoice_id' => $invoice->id,
                'payable_type'      => $payableType,
                'payable_id'        => $payableId,
                'reason'            => $e->getMessage(),
            ]);

            return $this->markFailed($invoice, $e->getMessage());
        }

        try {
            $result = $this->issuer->createIssuedInvoice($draft);
        } catch (Throwable $e) {
            Log::error('IssueFiscalInvoiceAction: fallo al emitir factura en B2BRouter', [
                'fiscal_invoice_id' => $invoice->id,
                'payable_type'      => $payableType,
                'payable_id'        => $payableId,
                'error'             => $e->getMessage(),
            ]);

            $this->markFailed($invoice, 'Error al comunicar con B2BRouter: '.$e->getMessage());

            throw $e; // deja que el Job reintente según su política de backoff
        }

        return $this->markProcessing($invoice, $result);
    }

    private function getOrCreatePending(string $payableType, int $payableId, int $amountCents, string $stripeSessionId): FiscalInvoice
    {
        return DB::transaction(function () use ($payableType, $payableId, $amountCents, $stripeSessionId): FiscalInvoice {
            $invoice = FiscalInvoice::query()
                ->where('stripe_checkout_session_id', $stripeSessionId)
                ->lockForUpdate()
                ->first();

            if ($invoice !== null) {
                return $invoice;
            }

            return FiscalInvoice::query()->create([
                'payable_type'               => $payableType,
                'payable_id'                 => $payableId,
                'stripe_checkout_session_id' => $stripeSessionId,
                'amount_cents'               => $amountCents,
                'currency'                   => 'EUR',
                'status'                     => FiscalInvoiceStatus::Pending,
            ]);
        });
    }

    private function markFailed(FiscalInvoice $invoice, string $reason): FiscalInvoice
    {
        return DB::transaction(function () use ($invoice, $reason): FiscalInvoice {
            $fresh = FiscalInvoice::query()->whereKey($invoice->id)->lockForUpdate()->first() ?? $invoice;

            $fresh->update([
                'status'     => FiscalInvoiceStatus::Failed,
                'last_error' => $reason,
            ]);

            return $fresh;
        });
    }

    private function markProcessing(FiscalInvoice $invoice, FiscalInvoiceResultDto $result): FiscalInvoice
    {
        return DB::transaction(function () use ($invoice, $result): FiscalInvoice {
            $fresh = FiscalInvoice::query()->whereKey($invoice->id)->lockForUpdate()->first() ?? $invoice;

            $fresh->update([
                'status'            => FiscalInvoiceStatus::Processing,
                'b2b_invoice_id'    => $result->b2bInvoiceId,
                'b2b_tax_report_id' => $result->firstTaxReportId(),
                'submitted_at'      => now(),
            ]);

            return $fresh;
        });
    }
}
