<?php

declare(strict_types=1);

namespace App\Events\Payments;

use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Se dispara cuando el webhook de Stripe confirma que el pago fue exitoso.
 * Listeners pueden enviar email de recibo, activar bono, etc.
 */
final class PaymentConfirmed
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public readonly string $payableType,
        public readonly int $payableId,
        public readonly int $amountCents,
        public readonly string $stripeSessionId,
    ) {}
}
