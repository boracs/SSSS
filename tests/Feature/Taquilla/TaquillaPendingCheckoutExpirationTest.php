<?php

declare(strict_types=1);

use App\Models\PagoCuota;
use App\Models\PlanTaquilla;
use App\Models\User;
use App\Services\Taquilla\TaquillaMembershipService;
use Carbon\Carbon;

/**
 * Una cuota de taquilla solo debe existir si Stripe confirmó el cobro. Si el socio
 * abre el checkout y no paga, el pendiente se borra: nada de filas "pending" que
 * ensucien el historial, bloqueen el reintento o desplacen el periodo del plan.
 */
beforeEach(function () {
    config(['taquilla.pending_unpaid_expiration_minutes' => 30]);
    Carbon::setTestNow('2026-06-15 10:00:00');

    $this->service = app(TaquillaMembershipService::class);
    $this->plan = PlanTaquilla::factory()->create(['duracion_dias' => 90, 'activo' => true]);
    $this->user = User::factory()->create(['numeroTaquilla' => 201]);
});

afterEach(function () {
    Carbon::setTestNow();
});

test('el pendiente creado para el checkout nace con ventana de caducidad', function () {
    $pago = $this->service->createPendingPaymentForCheckout($this->user, (int) $this->plan->id);

    expect($pago->status)->toBe(PagoCuota::STATUS_PENDING);
    expect($pago->expires_at->format('Y-m-d H:i'))->toBe('2026-06-15 10:30');
});

test('un checkout abandonado se borra al caducar y no queda historial', function () {
    $pago = $this->service->createPendingPaymentForCheckout($this->user, (int) $this->plan->id);

    Carbon::setTestNow('2026-06-15 10:31:00');
    $deleted = $this->service->purgeExpiredPendingPayments();

    expect($deleted)->toBe(1);
    expect(PagoCuota::query()->whereKey($pago->id)->exists())->toBeFalse();
});

test('un pendiente aun dentro de su ventana no se borra', function () {
    $pago = $this->service->createPendingPaymentForCheckout($this->user, (int) $this->plan->id);

    Carbon::setTestNow('2026-06-15 10:29:00');

    expect($this->service->purgeExpiredPendingPayments())->toBe(0);
    expect(PagoCuota::query()->whereKey($pago->id)->exists())->toBeTrue();
});

test('un pago confirmado nunca se borra aunque su expires_at quede en el pasado', function () {
    $pago = $this->service->createPendingPaymentForCheckout($this->user, (int) $this->plan->id);
    $this->service->confirmPaymentFromGateway((int) $pago->id);

    Carbon::setTestNow('2026-06-15 23:00:00');

    expect($this->service->purgeExpiredPendingPayments())->toBe(0);
    expect($pago->fresh()->status)->toBe(PagoCuota::STATUS_CONFIRMED);
    expect($pago->fresh()->expires_at)->toBeNull();
});

test('tras abandonar el pago el socio puede reintentar sin choque de duplicado', function () {
    $primero = $this->service->createPendingPaymentForCheckout($this->user, (int) $this->plan->id);

    Carbon::setTestNow('2026-06-15 11:00:00');
    $segundo = $this->service->createPendingPaymentForCheckout($this->user, (int) $this->plan->id);

    expect(PagoCuota::query()->whereKey($primero->id)->exists())->toBeFalse();
    expect($segundo->id)->not->toBe($primero->id);
    expect(PagoCuota::query()->where('user_id', $this->user->id)->count())->toBe(1);
});

test('un pendiente con sesión Stripe viva no se purga aunque expire su ventana local', function () {
    $pago = $this->service->createPendingPaymentForCheckout($this->user, (int) $this->plan->id);

    \App\Models\PaymentWebhookIdempotency::query()->create([
        'transaction_id' => 'cs_test_viva',
        'payable_type' => PagoCuota::class,
        'payable_id' => $pago->id,
        'amount' => (int) $pago->monto_pagado_cents,
        'status' => 'pending',
        'checkout_url' => 'https://checkout.stripe.test/viva',
        'expires_at' => now()->addDay(),
    ]);

    Carbon::setTestNow('2026-06-15 11:00:00');

    expect($this->service->purgeExpiredPendingPayments())->toBe(0);
    expect(PagoCuota::query()->whereKey($pago->id)->exists())->toBeTrue();
});

test('el periodo del reintento no se desplaza por el intento abandonado', function () {
    $primero = $this->service->createPendingPaymentForCheckout($this->user, (int) $this->plan->id);
    $inicioOriginal = $primero->periodo_inicio->toDateString();

    Carbon::setTestNow('2026-06-15 11:00:00');
    $segundo = $this->service->createPendingPaymentForCheckout($this->user, (int) $this->plan->id);

    expect($segundo->periodo_inicio->toDateString())->toBe($inicioOriginal);
});
