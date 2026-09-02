<?php

declare(strict_types=1);

namespace App\Actions\Invoicing;

use App\Contracts\Invoicing\FiscalInvoiceIssuerInterface;
use App\DTOs\Invoicing\FiscalInvoiceResultDto;
use App\Enums\FiscalInvoiceStatus;
use App\Exceptions\Invoicing\B2BRouterApiException;
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
 * Fallo transitorio (timeout/5xx): la fila se deja pending y se relanza la
 * excepción para el backoff del Job; el POST de alta lleva Idempotency-Key
 * estable por cobro para no duplicar TicketBAI si la 1ª respuesta se perdió.
 * Fallo permanente (datos fiscales, 4xx): markFailed() sin throw.
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
        } catch (B2BRouterApiException $e) {
            Log::error('IssueFiscalInvoiceAction: fallo al emitir factura en B2BRouter', [
                'fiscal_invoice_id' => $invoice->id,
                'payable_type'      => $payableType,
                'payable_id'        => $payableId,
                'retryable'         => $e->isRetryable(),
                'http_status'       => $e->httpStatus,
                'error'             => $e->getMessage(),
            ]);

            if (! $e->isRetryable()) {
                return $this->markFailed($invoice, 'Error permanente al comunicar con B2BRouter: '.$e->getMessage());
            }

            $this->recordTransientFailure($invoice, 'Error transitorio al comunicar con B2BRouter: '.$e->getMessage());

            throw $e;
        } catch (Throwable $e) {
            Log::error('IssueFiscalInvoiceAction: fallo inesperado al emitir factura en B2BRouter', [
                'fiscal_invoice_id' => $invoice->id,
                'payable_type'      => $payableType,
                'payable_id'        => $payableId,
                'error'             => $e->getMessage(),
            ]);

            $this->recordTransientFailure($invoice, 'Error transitorio al comunicar con B2BRouter: '.$e->getMessage());

            throw $e;
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

    /**
     * Deja la fila pending para que el Job reintente el POST con la misma
     * Idempotency-Key. No toca status: failed queda reservado a lo permanente.
     */
    private function recordTransientFailure(FiscalInvoice $invoice, string $reason): void
    {
        DB::transaction(function () use ($invoice, $reason): void {
            $fresh = FiscalInvoice::query()->whereKey($invoice->id)->lockForUpdate()->first();
            if ($fresh === null || $fresh->b2b_invoice_id !== null) {
                return;
            }

            $fresh->update(['last_error' => $reason]);
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
