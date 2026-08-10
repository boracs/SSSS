<?php

declare(strict_types=1);

use App\Models\PagoCuota;
use App\Models\PlanTaquilla;
use App\Models\User;
use App\Services\Taquilla\TaquillaMembershipService;
use Carbon\Carbon;

/**
 * Cobertura de `buildVigenciaPayload()`: el cálculo de `estado`/`dias_restantes`
 * alimenta directamente la tabla de vigencia de taquillas del admin (colores,
 * urgencia, textos). Bugs aquí ya han causado socios "vencidos" con días
 * positivos, o socios que nunca pagaron mostrados como "vencidos".
 */
beforeEach(function () {
    Carbon::setTestNow('2026-06-15 10:00:00');
    $this->plan = PlanTaquilla::factory()->create(['duracion_dias' => 90]);
});

afterEach(function () {
    Carbon::setTestNow();
});

function crearPagoConfirmado(User $user, PlanTaquilla $plan, string $inicio, string $fin): PagoCuota
{
    return PagoCuota::create([
        'user_id' => $user->id,
        'id_plan_pagado' => $plan->id,
        'monto_pagado_cents' => 5000,
        'status' => PagoCuota::STATUS_CONFIRMED,
        'payment_method' => 'datafono',
        'periodo_inicio' => $inicio,
        'periodo_fin' => $fin,
        'fecha_pago' => $inicio,
    ]);
}

function vigenciaRowFor(User $user): array
{
    $rows = app(TaquillaMembershipService::class)->buildVigenciaPayload();

    return collect($rows)->firstWhere('id', $user->id);
}

test('socio con cuota vigente hoy sale como activo con dias restantes positivos', function () {
    $user = User::factory()->create(['numeroTaquilla' => 101]);
    crearPagoConfirmado($user, $this->plan, '2026-05-20', '2026-07-20');

    $row = vigenciaRowFor($user);

    expect($row['estado'])->toBe('activo');
    expect($row['dias_restantes'])->toBe(35);
});

test('socio con cuota caducada y sin pago futuro sale como vencido con dias negativos', function () {
    $user = User::factory()->create(['numeroTaquilla' => 102]);
    crearPagoConfirmado($user, $this->plan, '2026-02-01', '2026-03-01');

    $row = vigenciaRowFor($user);

    expect($row['estado'])->toBe('vencido');
    expect($row['dias_restantes'])->toBeLessThan(0);
});

test('socio con solo un pago futuro (aun no empezado) sale como activo, no vencido', function () {
    // Regresión: antes salía "vencido" con días restantes positivos (130+).
    $user = User::factory()->create(['numeroTaquilla' => 103]);
    crearPagoConfirmado($user, $this->plan, '2026-08-01', '2026-10-30');

    $row = vigenciaRowFor($user);

    expect($row['estado'])->toBe('activo');
    expect($row['dias_restantes'])->toBeGreaterThan(0);
});

test('socio con taquilla asignada pero sin ningun pago confirmado sale como sin plan', function () {
    // Regresión: antes salía "vencido" aunque nunca pagó nada.
    $user = User::factory()->create(['numeroTaquilla' => 104]);

    $row = vigenciaRowFor($user);

    expect($row['estado'])->toBe('sin plan');
    expect($row['dias_restantes'])->toBeNull();
});

test('un pago pendiente o rechazado no cuenta como cobertura y sigue siendo sin plan', function () {
    $user = User::factory()->create(['numeroTaquilla' => 105]);
    PagoCuota::create([
        'user_id' => $user->id,
        'id_plan_pagado' => $this->plan->id,
        'monto_pagado_cents' => 5000,
        'status' => PagoCuota::STATUS_PENDING,
        'periodo_inicio' => '2026-06-01',
        'periodo_fin' => '2026-08-30',
    ]);

    $row = vigenciaRowFor($user);

    expect($row['estado'])->toBe('sin plan');
    expect($row['dias_restantes'])->toBeNull();
});

test('socio vencido con un pago futuro ya prepagado muestra los dias extra prepagados', function () {
    $user = User::factory()->create(['numeroTaquilla' => 106]);
    crearPagoConfirmado($user, $this->plan, '2026-02-01', '2026-03-01');
    crearPagoConfirmado($user, $this->plan, '2026-09-01', '2026-09-30');

    $row = vigenciaRowFor($user);

    expect($row['estado'])->toBe('vencido');
    expect($row['prepaid_extra_days'])->toBe(30);
});

test('socios sin taquilla asignada no aparecen en el listado de vigencia', function () {
    User::factory()->create(['numeroTaquilla' => null]);

    $rows = app(TaquillaMembershipService::class)->buildVigenciaPayload();

    expect($rows)->toBeEmpty();
});
