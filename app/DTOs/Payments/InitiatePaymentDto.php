<?php

declare(strict_types=1);

namespace App\DTOs\Payments;

use InvalidArgumentException;

/**
 * Contrato que describe una intención de cobro antes de redirigir al usuario a Stripe.
 *
 * payableType + payableId identifican el recurso a confirmar cuando llegue el webhook.
 */
final readonly class InitiatePaymentDto
{
    /**
     * @param  PaymentLineItemDto[]  $lineItems
     */
    public function __construct(
        public string $payableType,
        public int $payableId,
        public array $lineItems,
        public string $successPath,
        public string $cancelPath,
        public ?string $customerEmail = null,
        public array $metadata = [],
    ) {
        if ($this->payableType === '' || $this->payableId <= 0) {
            throw new InvalidArgumentException('payable_type y payable_id son obligatorios.');
        }

        if ($this->lineItems === []) {
            throw new InvalidArgumentException('lineItems no puede estar vacío.');
        }

        foreach ($this->lineItems as $index => $item) {
            if (! $item instanceof PaymentLineItemDto) {
                throw new InvalidArgumentException(
                    "lineItems[{$index}] debe ser instancia de PaymentLineItemDto."
                );
            }
        }

        if ($this->successPath === '' || $this->cancelPath === '') {
            throw new InvalidArgumentException('successPath y cancelPath son obligatorios.');
        }
    }

    public function successUrl(): string
    {
        return url($this->successPath).'?session_id={CHECKOUT_SESSION_ID}';
    }

    public function cancelUrl(): string
    {
        return url($this->cancelPath);
    }

    public function totalAmountCents(): int
    {
        return array_sum(
            array_map(
                static fn (PaymentLineItemDto $item): int => $item->unitAmountCents * $item->quantity,
                $this->lineItems,
            )
        );
    }
}
