<?php

declare(strict_types=1);

return [
    /*
    | Plazo del ganador para pagar tras el cierre (Ended + Pending).
    | Por defecto 24 h: coincide con la caducidad típica de Stripe Checkout.
    */
    'payment_grace_minutes' => (int) env('AUCTIONS_PAYMENT_GRACE_MINUTES', 1440),
];
