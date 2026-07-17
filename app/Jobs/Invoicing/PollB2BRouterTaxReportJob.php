<?php

declare(strict_types=1);

namespace App\Jobs\Invoicing;

use App\Actions\Invoicing\SyncFiscalTaxReportAction;
use App\Enums\FiscalInvoiceStatus;
use App\Models\FiscalInvoice;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\Middleware\WithoutOverlapping;
use Illuminate\Support\Facades\Log;

/**
 * Sondea el tax_report de una factura hasta que llegue a 'registered'/'error'.
 * Si sigue 'processing', se reencola a sí mismo con backoff (config('invoicing.poll'))
 * hasta agotar max_attempts; entonces se abandona y queda para revisión manual/CLI futura.
 */
final class PollB2BRouterTaxReportJob implements ShouldQueue
{
    use Queueable;

    /** El propio framework no reintenta este Job por excepción: el reintento por "processing" es explícito. */
    public int $tries = 1;

    public function __construct(
        public readonly int $fiscalInvoiceId,
        public readonly int $attempt = 1,
    ) {}

    /** @return array<int, object> */
    public function middleware(): array
    {
        return [(new WithoutOverlapping((string) $this->fiscalInvoiceId))->releaseAfter(30)];
    }

    public function handle(SyncFiscalTaxReportAction $action): void
    {
        if (! (bool) config('invoicing.enabled', false)) {
            return;
        }

        $invoice = FiscalInvoice::query()->find($this->fiscalInvoiceId);
        if ($invoice === null) {
            return;
        }

        $invoice = $action->execute($invoice);

        if ($invoice->status !== FiscalInvoiceStatus::Processing) {
            return; // estado terminal: registered o failed
        }

        $maxAttempts = (int) config('invoicing.poll.max_attempts', 8);
        if ($this->attempt >= $maxAttempts) {
            Log::warning('PollB2BRouterTaxReportJob: máximo de intentos de sondeo alcanzado sin resolución', [
                'fiscal_invoice_id' => $invoice->id,
                'attempts'          => $this->attempt,
            ]);

            return;
        }

        /** @var list<int> $backoff */
        $backoff = (array) config('invoicing.poll.backoff', [10, 20, 40, 60, 90, 120, 180, 300]);
        $delay   = $backoff[$this->attempt - 1] ?? (end($backoff) ?: 300);

        self::dispatch($this->fiscalInvoiceId, $this->attempt + 1)->delay(now()->addSeconds($delay));
    }
}
