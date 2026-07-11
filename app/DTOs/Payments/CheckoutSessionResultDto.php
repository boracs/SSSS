<?php

declare(strict_types=1);

namespace App\DTOs\Payments;

/**
 * Resultado atómico de crear una sesión Stripe Checkout.
 */
final readonly class CheckoutSessionResultDto
{
    public function __construct(
        public string $checkoutUrl,
        public string $stripeSessionId,
        public string $idempotencyToken,
    ) {}
}
