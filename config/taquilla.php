<?php

declare(strict_types=1);

return [
    /*
     * Minutos que vive un PagoCuota pendiente antes de considerarse checkout
     * abandonado. Al caducar se borra: la cuota solo existe si Stripe confirmó.
     */
    'pending_unpaid_expiration_minutes' => (int) env('TAQUILLA_PENDING_UNPAID_EXPIRATION_MINUTES', 30),
];
