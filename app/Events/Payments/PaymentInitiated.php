<?php

declare(strict_types=1);

namespace App\Events\Payments;

use App\DTOs\Payments\InitiatePaymentDto;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Se dispara justo antes de redirigir al usuario a Stripe.
 * Los Listeners pueden enviar email de confirmación, crear registros de auditoría, etc.
 */
final class PaymentInitiated
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public readonly InitiatePaymentDto $dto,
        public readonly string $stripeSessionId,
        public readonly string $checkoutUrl,
    ) {}
}
