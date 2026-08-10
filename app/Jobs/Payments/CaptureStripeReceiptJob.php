<?php

declare(strict_types=1);

namespace App\Jobs\Payments;

use App\Services\Payments\StripeReceiptCaptureService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

final class CaptureStripeReceiptJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 5;

    /** @var list<int> */
    public array $backoff = [30, 120, 300, 600];

    public function __construct(
        public readonly string $payableType,
        public readonly int $payableId,
        public readonly string $stripeSessionId,
    ) {}

    public function handle(StripeReceiptCaptureService $capture): void
    {
        // Conciliación datáfono reutiliza PaymentConfirmed con session_id sintético
        // (`datafono-{id}`); no hay Checkout Session de Stripe que capturar.
        if (! str_starts_with($this->stripeSessionId, 'cs_')) {
            return;
        }

        $receipt = $capture->capture(
            stripeSessionId: $this->stripeSessionId,
            payableType: $this->payableType,
            payableId: $this->payableId,
        );

        if ($receipt === null) {
            Log::warning('CaptureStripeReceiptJob: recibo no capturado', [
                'payable_type' => $this->payableType,
                'payable_id'   => $this->payableId,
                'session_id'   => $this->stripeSessionId,
            ]);
        }
    }
}
