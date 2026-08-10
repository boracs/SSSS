<?php

declare(strict_types=1);

/**
 * Parámetros operativos del alquiler de tablas (SSOT: App\Services\BookingService).
 * Los packs cobrables viven en App\Models\PriceSchema (MINUTE_PACKS / DAY_PACKS).
 */
return [

    /**
     * Margen de rotación entre alquileres (secado, revisión, cambio de quillas).
     * NO se cobra al cliente: solo amplía la ventana de bloqueo del inventario.
     */
    'turnover_buffer_minutes' => (int) env('RENTALS_TURNOVER_BUFFER_MINUTES', 30),

    /**
     * Flexibilidad de recogida: [pickup_at − X, pickup_at + X].
     */
    'pickup_flexibility_minutes' => (int) env('RENTALS_PICKUP_FLEXIBILITY_MINUTES', 30),

    /**
     * Margen tras pickup_at antes de considerar no-show y liberar la tabla.
     */
    'no_show_grace_minutes' => (int) env('RENTALS_NO_SHOW_GRACE_MINUTES', 30),

    /**
     * Barrido automático de no-shows. DESACTIVADO hasta que el mostrador pueda
     * marcar la recogida (picked_up_at): sin ese dato toda reserva pasada
     * parecería un no-show. La liberación manual por reserva sigue disponible.
     */
    'no_show_release_enabled' => (bool) env('RENTALS_NO_SHOW_RELEASE_ENABLED', false),

    /**
     * El barrido solo mira recogidas recientes; nunca reservas históricas.
     */
    'no_show_lookback_hours' => (int) env('RENTALS_NO_SHOW_LOOKBACK_HOURS', 24),

    /**
     * Hora de recogida/devolución en modo día (ciclo 12:00 → 12:00, reloj de pared escuela).
     */
    'day_mode_pickup_hour' => (int) env('RENTALS_DAY_MODE_PICKUP_HOUR', 12),

    /**
     * Horario de mostrador para alquileres por horas (reloj de pared escuela).
     * La recogida y la devolución cobrada deben caber dentro de la ventana:
     * un pack de 6 h con cierre a las 19:00 no se ofrece más tarde de las 13:00.
     */
    'pickup_window_start' => (string) env('RENTALS_PICKUP_WINDOW_START', '09:00'),
    'pickup_window_end' => (string) env('RENTALS_PICKUP_WINDOW_END', '19:00'),

    /**
     * Granularidad de los slots de recogida ofrecidos al cliente.
     */
    'pickup_slot_step_minutes' => (int) env('RENTALS_PICKUP_SLOT_STEP_MINUTES', 30),

    /**
     * Señal online (% del total) y caducidad de la reserva pendiente de pago.
     */
    'deposit_percentage' => (float) env('RENTALS_DEPOSIT_PERCENTAGE', 30),

    /**
     * Caducidad larga: reserva creada a mano en Admin (mostrador/teléfono), que se
     * cobra en persona cuando el cliente pasa a recoger la tabla.
     */
    'pending_expiration_days' => (int) env('RENTALS_PENDING_EXPIRATION_DAYS', 7),

    /**
     * Caducidad corta: reserva pública que va directa a Stripe Checkout. Si el
     * cliente abandona el pago, la tabla no debe quedar bloqueada días enteros.
     */
    'pending_unpaid_expiration_minutes' => (int) env('RENTALS_PENDING_UNPAID_EXPIRATION_MINUTES', 45),

    /**
     * Granularidad del cálculo de mejor precio (mcd de 60 y 90 min).
     */
    'pricing_step_minutes' => 30,

    /**
     * Tope defensivo de duración para no disparar el DP con rangos absurdos.
     */
    'max_rental_days' => (int) env('RENTALS_MAX_DAYS', 60),

];
