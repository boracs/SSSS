<?php

declare(strict_types=1);

namespace App\Listeners\Payments;

use App\Events\Payments\PaymentConfirmed;
use App\Jobs\Payments\CaptureStripeReceiptJob;
use Illuminate\Contracts\Queue\ShouldQueue;

final class DispatchStripeReceiptCaptureListener implements ShouldQueue
{
    public function handle(PaymentConfirmed $event): void
    {
        CaptureStripeReceiptJob::dispatch(
            payableType: $event->payableType,
            payableId: $event->payableId,
            stripeSessionId: $event->stripeSessionId,
        );
    }
}
