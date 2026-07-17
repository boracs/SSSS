<?php

declare(strict_types=1);

namespace App\Jobs\Invoicing;

use App\Actions\Invoicing\IssueFiscalInvoiceAction;
use App\Enums\FiscalInvoiceStatus;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\Middleware\WithoutOverlapping;

/**
 * Crea la factura fiscal en B2BRouter para un pago Stripe confirmado y, si queda
 * en 'processing' con tax_report asociado, encola el primer sondeo de estado.
 */
final class CreateB2BRouterInvoiceJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 5;

    /** @var list<int> */
    public array $backoff = [15, 60, 180, 600, 1800];

    public function __construct(
        public readonly string $payableType,
        public readonly int $payableId,
        public readonly int $amountCents,
        public readonly string $stripeSessionId,
    ) {}

    /** @return array<int, object> */
    public function middleware(): array
    {
        return [(new WithoutOverlapping($this->stripeSessionId))->releaseAfter(60)];
    }

    public function handle(IssueFiscalInvoiceAction $action): void
    {
        if (! (bool) config('invoicing.enabled', false)) {
            return;
        }

        $invoice = $action->execute($this->payableType, $this->payableId, $this->amountCents, $this->stripeSessionId);

        if ($invoice->status === FiscalInvoiceStatus::Processing && $invoice->b2b_tax_report_id !== null) {
            PollB2BRouterTaxReportJob::dispatch($invoice->id)->delay(now()->addSeconds(10));
        }
    }
}
