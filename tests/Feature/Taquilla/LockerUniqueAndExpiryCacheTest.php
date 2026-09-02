<?php

declare(strict_types=1);

use App\Models\PagoCuota;
use App\Models\PlanTaquilla;
use App\Models\User;
use App\Services\Taquilla\TaquillaMembershipService;
use App\Support\VipVirtualLocker;
use Carbon\Carbon;
use Illuminate\Database\QueryException;
use Illuminate\Validation\ValidationException;

test('dos socios no pueden ocupar la misma taquilla física', function () {
    $ocupante = User::factory()->create(['numeroTaquilla' => 88]);
    $otro = User::factory()->create(['numeroTaquilla' => null]);

    expect(fn () => app(TaquillaMembershipService::class)->darDeAltaTaquilla($otro, 88))
        ->toThrow(ValidationException::class);

    expect((int) $ocupante->fresh()->numeroTaquilla)->toBe(88)
        ->and($otro->fresh()->numeroTaquilla)->toBeNull();
});

test('la taquilla virtual 500/600 sí puede repetirse', function () {
    $a = User::factory()->create(['numeroTaquilla' => 500]);
    $b = User::factory()->create(['numeroTaquilla' => null, 'is_vip' => true]);

    $alta = app(TaquillaMembershipService::class)->darDeAltaTaquilla($b, 500);

    expect((int) $a->fresh()->numeroTaquilla)->toBe(500)
        ->and((int) $alta->numeroTaquilla)->toBe(500)
        ->and(VipVirtualLocker::allowsMultipleAssignments(600))->toBeTrue();

    User::factory()->create(['numeroTaquilla' => 600]);
    User::factory()->create(['numeroTaquilla' => 600]);

    expect(User::query()->where('numeroTaquilla', 600)->count())->toBe(2);
});

test('el UNIQUE de BD bloquea un update concurrente a un número físico ocupado', function () {
    User::factory()->create(['numeroTaquilla' => 91]);
    $otro = User::factory()->create(['numeroTaquilla' => null]);

    $otro->numeroTaquilla = 91;

    expect(fn () => $otro->save())->toThrow(QueryException::class);
});

test('el caché de vigencia usa MAX(periodo_fin) confirmado aunque el periodo aún no haya empezado', function () {
    Carbon::setTestNow('2026-06-15 10:00:00');

    $plan = PlanTaquilla::factory()->create(['duracion_dias' => 90, 'activo' => true]);
    $user = User::factory()->create([
        'numeroTaquilla' => 302,
        'fecha_vencimiento_cuota' => '2026-06-10',
    ]);

    PagoCuota::query()->create([
        'user_id' => $user->id,
        'id_plan_pagado' => $plan->id,
        'monto_pagado_cents' => 5000,
        'status' => PagoCuota::STATUS_CONFIRMED,
        'payment_method' => 'datafono',
        'periodo_inicio' => '2026-06-20',
        'periodo_fin' => '2026-09-18',
        'fecha_pago' => '2026-06-15',
    ]);

    app(TaquillaMembershipService::class)->syncUserLockerCacheFromConfirmedPayments($user->fresh());

    expect($user->fresh()->fecha_vencimiento_cuota->toDateString())->toBe('2026-09-18')
        ->and($user->fresh()->isLockerPaymentUpToDate())->toBeTrue();

    Carbon::setTestNow();
});

test('taquilla:sync-expiry-cache actualiza socios con prepago futuro', function () {
    Carbon::setTestNow('2026-06-15 10:00:00');

    $plan = PlanTaquilla::factory()->create(['duracion_dias' => 30, 'activo' => true]);
    $user = User::factory()->create([
        'numeroTaquilla' => 303,
        'fecha_vencimiento_cuota' => '2026-06-01',
    ]);

    PagoCuota::query()->create([
        'user_id' => $user->id,
        'id_plan_pagado' => $plan->id,
        'monto_pagado_cents' => 4000,
        'status' => PagoCuota::STATUS_CONFIRMED,
        'payment_method' => 'card',
        'periodo_inicio' => '2026-07-01',
        'periodo_fin' => '2026-07-31',
        'fecha_pago' => '2026-06-15',
    ]);

    $this->artisan('taquilla:sync-expiry-cache')->assertSuccessful();

    expect($user->fresh()->fecha_vencimiento_cuota->toDateString())->toBe('2026-07-31');

    Carbon::setTestNow();
});
