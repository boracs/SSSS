<?php

declare(strict_types=1);

use App\Models\PagoCuota;
use App\Models\PlanTaquilla;
use App\Models\User;
use App\Services\Taquilla\TaquillaMembershipService;
use Carbon\Carbon;

/**
 * El periodo de una cuota nueva se encadena al último que da cobertura. Un pago
 * RECHAZADO no da cobertura: si desplaza el `periodo_inicio`, el socio paga hoy y
 * su taquilla arranca semanas después (y el caché de vigencia nunca le da acceso).
 */
beforeEach(function () {
    config(['taquilla.pending_unpaid_expiration_minutes' => 30]);
    Carbon::setTestNow('2026-06-15 10:00:00');

    $this->service = app(TaquillaMembershipService::class);
    $this->plan = PlanTaquilla::factory()->create(['duracion_dias' => 90, 'activo' => true]);
    $this->user = User::factory()->create(['numeroTaquilla' => 301]);
});

afterEach(function () {
    Carbon::setTestNow();
});

test('un pago rechazado con periodo futuro no desplaza el inicio del pago nuevo', function () {
    PagoCuota::create([
        'user_id' => $this->user->id,
        'id_plan_pagado' => $this->plan->id,
        'monto_pagado_cents' => 5000,
        'status' => PagoCuota::STATUS_REJECTED,
        'payment_method' => 'datafono',
        'periodo_inicio' => '2026-06-15',
        'periodo_fin' => '2026-09-13',
        'fecha_pago' => '2026-06-15',
    ]);

    $pago = $this->service->createPendingPaymentForCheckout($this->user, (int) $this->plan->id);

    expect($pago->periodo_inicio->toDateString())->toBe('2026-06-15');
});

test('un pago confirmado vigente sí encadena el periodo del pago nuevo', function () {
    PagoCuota::create([
        'user_id' => $this->user->id,
        'id_plan_pagado' => $this->plan->id,
        'monto_pagado_cents' => 5000,
        'status' => PagoCuota::STATUS_CONFIRMED,
        'payment_method' => 'datafono',
        'periodo_inicio' => '2026-05-20',
        'periodo_fin' => '2026-07-20',
        'fecha_pago' => '2026-05-20',
    ]);

    $pago = $this->service->createPendingPaymentForCheckout($this->user, (int) $this->plan->id);

    expect($pago->periodo_inicio->toDateString())->toBe('2026-07-21');
});

test('un pendiente vivo de otro plan sigue encadenando (no se solapan periodos)', function () {
    $otroPlan = PlanTaquilla::factory()->create(['duracion_dias' => 30, 'activo' => true]);
    $primero = $this->service->createPendingPaymentForCheckout($this->user, (int) $otroPlan->id);

    $segundo = $this->service->createPendingPaymentForCheckout($this->user, (int) $this->plan->id);

    expect($segundo->periodo_inicio->toDateString())
        ->toBe($primero->periodo_fin->copy()->addDay()->toDateString());
});
