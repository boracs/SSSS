<?php

declare(strict_types=1);

namespace App\Listeners\Payments;

use App\Events\Payments\PaymentConfirmed;
use App\Jobs\Invoicing\CreateB2BRouterInvoiceJob;
use Illuminate\Contracts\Queue\ShouldQueue;

/**
 * PaymentConfirmed → CreateB2BRouterInvoiceJob (facturación fiscal TicketBAI).
 *
 * Early-return si INVOICING_ENABLED=false o el payable_type no está habilitado:
 * cero Jobs, cero filas, cero llamadas HTTP. No debe interferir nunca con
 * DispatchStripeReceiptCaptureListener ni con la confirmación del pago.
 */
final class DispatchB2BRouterInvoiceListener implements ShouldQueue
{
    public function handle(PaymentConfirmed $event): void
    {
        if (! (bool) config('invoicing.enabled', false)) {
            return;
        }

        if (! (bool) config("invoicing.payable_types.{$event->payableType}", false)) {
            return;
        }

        CreateB2BRouterInvoiceJob::dispatch(
            $event->payableType,
            $event->payableId,
            $event->amountCents,
            $event->stripeSessionId,
        );
    }
}
