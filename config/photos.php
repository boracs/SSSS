<?php

declare(strict_types=1);

return [
    /*
    | Caducidad de reservas públicas pendientes de pago Stripe (minutos).
    | Admin / datáfono no usan expires_at (null).
    */
    'pending_unpaid_expiration_minutes' => (int) env('PHOTOS_PENDING_UNPAID_EXPIRATION_MINUTES', 30),
];
