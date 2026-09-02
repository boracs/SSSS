<?php

declare(strict_types=1);

use App\Models\PagoCuota;
use App\Models\PlanTaquilla;
use App\Models\User;
use App\Services\Taquilla\TaquillaMembershipService;
use Carbon\Carbon;

/**
 * Norma del club sobre la cuota de taquilla:
 *
 * - El socio que NO se da de baja sigue devengando cuota. Su periodo encadena al
 *   anterior aunque haya dejado meses sin pagar: esa deuda es intencional.
 * - El socio que se dio de baja (o al que el club le retiró la plaza) no debe el
 *   tiempo que estuvo fuera: al volver, su periodo arranca el día que paga.
 *
 * Antes esto era indistinguible: la baja no dejaba rastro en la base.
 */
beforeEach(function () {
    config(['taquilla.pending_unpaid_expiration_minutes' => 30]);
    Carbon::setTestNow('2026-06-15 10:00:00');

    $this->service = app(TaquillaMembershipService::class);
    $this->plan = PlanTaquilla::factory()->create(['duracion_dias' => 90, 'activo' => true]);
});

afterEach(function () {
    Carbon::setTestNow();
});

function socioConTaquilla(array $overrides = []): User
{
    return User::factory()->create(array_merge(['numeroTaquilla' => 410], $overrides));
}

function pagoConfirmado(User $user, PlanTaquilla $plan, string $inicio, string $fin): PagoCuota
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

test('el socio que nunca avisó la baja sigue debiendo: su periodo encadena al anterior', function () {
    $user = socioConTaquilla();
    // Caducó hace dos meses y medio y nunca se dio de baja.
    pagoConfirmado($user, $this->plan, '2026-01-01', '2026-03-31');

    $pago = $this->service->createPendingPaymentForCheckout($user->fresh(), (int) $this->plan->id);

    expect($pago->periodo_inicio->toDateString())->toBe('2026-04-01');
});

test('el socio que se dio de baja y vuelve arranca hoy, sin pagar el tiempo fuera', function () {
    $user = socioConTaquilla();
    // Periodo hasta el 31 de enero; avisó y se le dio la baja el 27.
    pagoConfirmado($user, $this->plan, '2025-11-03', '2026-01-31');
    $user->update([
        'taquilla_baja_efectiva_at' => '2026-01-27 12:00:00',
        'taquilla_alta_at' => '2026-06-15 09:00:00',
    ]);

    $pago = $this->service->createPendingPaymentForCheckout($user->fresh(), (int) $this->plan->id);

    expect($pago->periodo_inicio->toDateString())->toBe('2026-06-15')
        ->and($pago->periodo_fin->toDateString())->toBe('2026-09-12');
});

test('darse de baja y repensarlo dentro del periodo pagado no regala días: sigue encadenando', function () {
    $user = socioConTaquilla();
    // Cobertura hasta el 20 de julio: renovar hoy no puede solapar ni recortar.
    pagoConfirmado($user, $this->plan, '2026-04-21', '2026-07-20');
    $user->update(['taquilla_baja_efectiva_at' => '2026-06-10 12:00:00']);

    $pago = $this->service->createPendingPaymentForCheckout($user->fresh(), (int) $this->plan->id);

    expect($pago->periodo_inicio->toDateString())->toBe('2026-07-21');
});

test('un alta posterior al último periodo también corta el devengo (bajas sin registrar)', function () {
    $user = socioConTaquilla();
    pagoConfirmado($user, $this->plan, '2025-11-03', '2026-01-31');
    // Sin baja en la base (se fue antes de que se registraran), pero sí alta al volver.
    $user->update(['taquilla_alta_at' => '2026-06-14 18:00:00']);

    $pago = $this->service->createPendingPaymentForCheckout($user->fresh(), (int) $this->plan->id);

    expect($pago->periodo_inicio->toDateString())->toBe('2026-06-15');
});

test('confirmar la baja libera la plaza y sella la fecha de baja efectiva', function () {
    $user = socioConTaquilla(['taquilla_baja_solicitada_at' => '2026-06-10 09:00:00']);

    $this->service->confirmarBajaTaquilla($user);

    $fresh = $user->fresh();
    expect($fresh->numeroTaquilla)->toBeNull()
        ->and($fresh->taquilla_baja_solicitada_at)->toBeNull()
        ->and($fresh->taquilla_baja_efectiva_at?->toDateString())->toBe('2026-06-15');
});

test('liberar la taquilla desde el asignador también cuenta como baja efectiva', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $user = socioConTaquilla();

    $this->actingAs($admin)
        ->post(route('asignar.taquilla.liberar', $user->id))
        ->assertSessionHas('success');

    $fresh = $user->fresh();
    expect($fresh->numeroTaquilla)->toBeNull()
        ->and($fresh->taquilla_baja_efectiva_at?->toDateString())->toBe('2026-06-15');
});

test('el alta sella la fecha y rechaza una taquilla ya ocupada', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $ocupante = socioConTaquilla(['numeroTaquilla' => 77]);
    $vuelve = User::factory()->create([
        'numeroTaquilla' => null,
        'taquilla_baja_efectiva_at' => '2026-02-01 10:00:00',
    ]);

    $this->actingAs($admin)
        ->post(route('taquilla.usuarios.alta', $vuelve->id), ['numero_taquilla' => 77])
        ->assertSessionHas('error');

    expect($vuelve->fresh()->numeroTaquilla)->toBeNull()
        ->and($ocupante->fresh()->numeroTaquilla)->toBe(77);

    $this->actingAs($admin)
        ->post(route('taquilla.usuarios.alta', $vuelve->id), ['numero_taquilla' => 78])
        ->assertSessionHas('success');

    $fresh = $vuelve->fresh();
    expect($fresh->numeroTaquilla)->toBe(78)
        ->and($fresh->taquilla_alta_at?->toDateString())->toBe('2026-06-15')
        // La baja no se borra: la necesita el cálculo del periodo.
        ->and($fresh->taquilla_baja_efectiva_at)->not->toBeNull();
});

test('cambiar de número a un socio activo no reinicia su fecha de alta', function () {
    $user = socioConTaquilla(['taquilla_alta_at' => '2025-09-01 10:00:00']);

    $this->service->darDeAltaTaquilla($user, 411);

    $fresh = $user->fresh();
    expect($fresh->numeroTaquilla)->toBe(411)
        ->and($fresh->taquilla_alta_at?->toDateString())->toBe('2025-09-01');
});

test('el panel de vigencia sirve las dos listas', function () {
    // Sin taquilla y sin pagos: el admin no cae en ninguna de las dos listas.
    $admin = User::factory()->create(['role' => 'admin', 'numeroTaquilla' => null]);
    $activo = socioConTaquilla();
    $ex = User::factory()->create([
        'numeroTaquilla' => null,
        'taquilla_baja_efectiva_at' => '2026-03-01 10:00:00',
    ]);

    $this->actingAs($admin)
        ->get(route('taquilla.vigencia'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Admin/Taquillas/Vigencia')
            ->where('usuarios.0.id', $activo->id)
            ->where('exSocios.0.id', $ex->id)
            ->has('sharedLockerNumbers'));
});

test('el listado de ex-socios trae a quien tuvo taquilla y deja fuera al resto', function () {
    $exConBaja = User::factory()->create([
        'numeroTaquilla' => null,
        'taquilla_baja_efectiva_at' => '2026-03-01 10:00:00',
    ]);
    $exConPagos = User::factory()->create(['numeroTaquilla' => null]);
    pagoConfirmado($exConPagos, $this->plan, '2025-01-01', '2025-03-31');
    $nuncaTuvo = User::factory()->create(['numeroTaquilla' => null]);
    $activo = socioConTaquilla();

    $ids = collect($this->service->buildExSociosPayload())->pluck('id');

    expect($ids)->toContain($exConBaja->id)
        ->and($ids)->toContain($exConPagos->id)
        ->and($ids)->not->toContain($nuncaTuvo->id)
        ->and($ids)->not->toContain($activo->id);
});

test('un alta programada reserva el número y no sella el alta hasta el día D', function () {
    $vuelve = User::factory()->create([
        'numeroTaquilla' => null,
        'taquilla_baja_efectiva_at' => '2026-02-01 10:00:00',
    ]);

    $this->service->darDeAltaTaquilla($vuelve, 78, Carbon::parse('2026-06-16'));

    $fresh = $vuelve->fresh();
    expect($fresh->numeroTaquilla)->toBe(78)
        ->and($fresh->taquilla_alta_at)->toBeNull()
        ->and($fresh->taquilla_alta_programada_at?->toDateString())->toBe('2026-06-16')
        ->and($fresh->isLockerAltaEffective())->toBeFalse();
});

test('si paga antes de entrar, el periodo arranca el día programado, no hoy', function () {
    $user = socioConTaquilla(['numeroTaquilla' => 79]);
    pagoConfirmado($user, $this->plan, '2025-11-03', '2026-01-31');
    $user->update([
        'taquilla_baja_efectiva_at' => '2026-01-27 12:00:00',
        'taquilla_alta_at' => null,
        'taquilla_alta_programada_at' => '2026-06-16',
    ]);

    $pago = $this->service->createPendingPaymentForCheckout($user->fresh(), (int) $this->plan->id);

    expect($pago->periodo_inicio->toDateString())->toBe('2026-06-16')
        ->and($pago->periodo_fin->toDateString())->toBe('2026-09-13');
});

test('el cron sella el alta el día D y deja de marcarla como programada', function () {
    $user = User::factory()->create([
        'numeroTaquilla' => 80,
        'taquilla_alta_at' => null,
        'taquilla_alta_programada_at' => '2026-06-15',
    ]);

    $this->artisan('taquilla:apply-scheduled-altas')->assertSuccessful();

    $fresh = $user->fresh();
    expect($fresh->taquilla_alta_programada_at)->toBeNull()
        ->and($fresh->taquilla_alta_at?->toDateString())->toBe('2026-06-15')
        ->and($fresh->isLockerAltaEffective())->toBeTrue();
});

test('el panel acepta alta_el futura y reserva la plaza', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $vuelve = User::factory()->create([
        'numeroTaquilla' => null,
        'taquilla_baja_efectiva_at' => '2026-02-01 10:00:00',
    ]);

    $this->actingAs($admin)
        ->post(route('taquilla.usuarios.alta', $vuelve->id), [
            'numero_taquilla' => 81,
            'alta_el' => '2026-06-16',
        ])
        ->assertSessionHas('success');

    $fresh = $vuelve->fresh();
    expect($fresh->numeroTaquilla)->toBe(81)
        ->and($fresh->taquilla_alta_at)->toBeNull()
        ->and($fresh->taquilla_alta_programada_at?->toDateString())->toBe('2026-06-16');
});
