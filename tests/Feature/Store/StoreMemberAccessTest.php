<?php

declare(strict_types=1);

use App\Models\PagoCuota;
use App\Models\PlanTaquilla;
use App\Models\User;
use App\Services\Vip\VipMembershipService;
use App\Support\VipVirtualLocker;

function socioConTaquillaAlDia(int $locker = 12): User
{
    $user = User::factory()->create([
        'is_vip' => false,
        'role' => 'user',
        'numeroTaquilla' => $locker,
        'fecha_vencimiento_cuota' => now()->addMonth(),
    ]);

    $plan = PlanTaquilla::factory()->create(['duracion_dias' => 90]);

    PagoCuota::query()->create([
        'user_id' => $user->id,
        'id_plan_pagado' => $plan->id,
        'monto_pagado_cents' => 5000,
        'status' => PagoCuota::STATUS_CONFIRMED,
        'payment_method' => 'datafono',
        'periodo_inicio' => now()->subMonth()->toDateString(),
        'periodo_fin' => now()->addMonth()->toDateString(),
        'fecha_pago' => now()->subMonth()->toDateString(),
    ]);

    return $user->fresh();
}

test('activar VIP sin taquilla asigna #500 y permite comprar', function () {
    $user = User::factory()->create([
        'is_vip' => false,
        'role' => 'user',
        'numeroTaquilla' => null,
    ]);

    $updated = app(VipMembershipService::class)->activate($user);

    expect($updated->is_vip)->toBeTrue()
        ->and((int) $updated->numeroTaquilla)->toBe(VipVirtualLocker::defaultNumber())
        ->and($updated->hasSharedLocker())->toBeTrue()
        ->and($updated->canAccessStoreWithMemberDiscount())->toBeTrue();
});

test('activar VIP con taquilla física no pisa el número', function () {
    $user = User::factory()->create([
        'is_vip' => false,
        'role' => 'user',
        'numeroTaquilla' => 42,
    ]);

    $updated = app(VipMembershipService::class)->activate($user);

    expect($updated->is_vip)->toBeTrue()
        ->and((int) $updated->numeroTaquilla)->toBe(42)
        ->and($updated->hasPhysicalLocker())->toBeTrue()
        ->and($updated->canAccessStoreWithMemberDiscount())->toBeTrue();
});

test('desactivar VIP libera solo la taquilla virtual #500', function () {
    $user = User::factory()->create([
        'is_vip' => false,
        'role' => 'user',
        'numeroTaquilla' => null,
    ]);

    $service = app(VipMembershipService::class);
    $vip = $service->activate($user);
    $updated = $service->deactivate($vip);

    expect($updated->is_vip)->toBeFalse()
        ->and($updated->numeroTaquilla)->toBeNull()
        ->and($updated->canAccessStoreWithMemberDiscount())->toBeFalse();
});

test('socio con taquilla física al día compra sin ser VIP', function () {
    $user = socioConTaquillaAlDia(18);

    expect($user->is_vip)->toBeFalse()
        ->and($user->hasPhysicalLocker())->toBeTrue()
        ->and($user->canAccessStoreWithMemberDiscount())->toBeTrue();
});

test('usuario sin VIP ni taquilla no puede comprar', function () {
    $user = User::factory()->create([
        'is_vip' => false,
        'role' => 'user',
        'numeroTaquilla' => null,
    ]);

    expect($user->canAccessStoreWithMemberDiscount())->toBeFalse();

    $this->actingAs($user)
        ->get(route('carrito'))
        ->assertRedirect(route('tienda'));
});

test('VIP con #500 entra al carrito', function () {
    $user = User::factory()->create([
        'is_vip' => false,
        'role' => 'user',
        'numeroTaquilla' => null,
    ]);

    $vip = app(VipMembershipService::class)->activate($user);

    $this->actingAs($vip)
        ->get(route('carrito'))
        ->assertOk();
});

test('backfill asigna #500 a VIPs huérfanos', function () {
    $orphan = User::factory()->create([
        'is_vip' => true,
        'role' => 'user',
        'numeroTaquilla' => null,
    ]);

    $updated = app(VipMembershipService::class)->backfillSharedLockersForVips();

    expect($updated)->toBeGreaterThanOrEqual(1)
        ->and((int) $orphan->fresh()->numeroTaquilla)->toBe(VipVirtualLocker::defaultNumber())
        ->and($orphan->fresh()->canAccessStoreWithMemberDiscount())->toBeTrue();
});
