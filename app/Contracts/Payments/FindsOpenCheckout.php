<?php

declare(strict_types=1);

namespace App\Contracts\Payments;

/**
 * Invariante «una sesión de pago viva por payable»: antes de abrir una sesión
 * nueva hay que comprobar si el mismo payable ya tiene una sin consumir.
 */
interface FindsOpenCheckout
{
    /**
     * URL de la sesión Stripe todavía utilizable para ese payable, o null.
     */
    public function openCheckoutUrlFor(string $payableType, int $payableId): ?string;
}
