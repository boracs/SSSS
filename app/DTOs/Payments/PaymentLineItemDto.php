<?php

declare(strict_types=1);

namespace App\DTOs\Payments;

use InvalidArgumentException;

/**
 * Representa una línea de producto/servicio para la sesión de Stripe Checkout.
 * El precio SIEMPRE en céntimos (int) para evitar errores de coma flotante.
 */
final readonly class PaymentLineItemDto
{
    public function __construct(
        public string $name,
        public string $description,
        public int $unitAmountCents,
        public int $quantity,
    ) {
        if ($this->name === '') {
            throw new InvalidArgumentException('El nombre de la línea de pago es obligatorio.');
        }

        if ($this->unitAmountCents < 0) {
            throw new InvalidArgumentException('unitAmountCents no puede ser negativo.');
        }

        if ($this->quantity < 1) {
            throw new InvalidArgumentException('quantity debe ser al menos 1.');
        }
    }

    /** @return array<string, mixed> */
    public function toStripeLineItem(): array
    {
        return [
            'price_data' => [
                'currency'     => config('services.stripe.currency', 'eur'),
                'unit_amount'  => $this->unitAmountCents,
                'product_data' => [
                    'name'        => $this->name,
                    'description' => $this->description,
                ],
            ],
            'quantity' => $this->quantity,
        ];
    }
}
