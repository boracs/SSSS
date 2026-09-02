<?php

declare(strict_types=1);

namespace Tests\Support;

use App\Contracts\Payments\StartsCheckout;
use App\DTOs\Payments\InitiatePaymentDto;
use App\Services\Payments\PaymentGatewayService;

/**
 * Emula al gateway real sin tocar Stripe: cada sesión abierta deja registrado su
 * intent, que es lo que permite reutilizarla en un segundo intento del mismo
 * payable (invariante «una sesión viva por payable»).
 */
final class RecordingCheckoutFake implements StartsCheckout
{
    public int $calls = 0;

    public function execute(InitiatePaymentDto $dto): string
    {
        $this->calls++;
        $url = 'https://checkout.stripe.test/session-'.$this->calls;

        app(PaymentGatewayService::class)->registerPaymentIntent(
            transactionId: 'cs_test_'.$this->calls,
            payableType: $dto->payableType,
            payableId: $dto->payableId,
            expectedAmountCents: $dto->totalAmountCents(),
            idempotencyToken: 'tok_'.$this->calls,
            checkoutUrl: $url,
            expiresAt: now()->addDay(),
        );

        return $url;
    }
}
