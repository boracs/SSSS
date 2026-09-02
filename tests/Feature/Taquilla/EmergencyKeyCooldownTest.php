<?php

declare(strict_types=1);

use App\Exceptions\EmergencyKeyNotEligibleException;
use App\Models\EmergencyKeyRequest;
use App\Models\EmergencyLockSetting;
use App\Models\PagoCuota;
use App\Models\PlanTaquilla;
use App\Models\User;
use App\Services\EmergencyKeyService;
use App\Support\VipVirtualLocker;
use Carbon\Carbon;

/**
 * @return array{0: User, 1: EmergencyLockSetting}
 */
function l5bSocioConCandado(): array
{
    $plan = PlanTaquilla::factory()->create(['activo' => true, 'duracion_dias' => 90]);
    $user = User::factory()->create([
        'role' => 'user',
        'numeroTaquilla' => 77,
        'fecha_vencimiento_cuota' => now()->addMonth()->toDateString(),
    ]);

    PagoCuota::query()->create([
        'user_id' => $user->id,
        'id_plan_pagado' => $plan->id,
        'monto_pagado_cents' => 5000,
        'status' => PagoCuota::STATUS_CONFIRMED,
        'payment_method' => 'datafono',
        'periodo_inicio' => now()->subDay()->toDateString(),
        'periodo_fin' => now()->addMonth()->toDateString(),
        'fecha_pago' => now()->toDateString(),
    ]);

    $settings = EmergencyLockSetting::query()->firstOrFail();
    $settings->update(['is_active' => true, 'current_code' => '4321']);

    return [$user->fresh(), $settings->fresh()];
}

test('el segundo reveal el mismo día choca con el cooldown aunque el candado se reactive', function () {
    [$user] = l5bSocioConCandado();
    $service = app(EmergencyKeyService::class);

    $primero = $service->requestCode($user);
    expect($primero->code)->toBe('4321');

    expect((int) EmergencyKeyRequest::query()->where('user_id', $user->id)->value('locker_number'))->toBe(77);

    EmergencyLockSetting::query()->firstOrFail()->update(['is_active' => true]);

    expect(fn () => $service->requestCode($user->fresh()))
        ->toThrow(EmergencyKeyNotEligibleException::class, 'Ya has solicitado la llave de emergencia hoy');
});

test('socio sin taquilla física no puede revelar el código', function () {
    $vip = User::factory()->create([
        'role' => 'user',
        'is_vip' => true,
        'numeroTaquilla' => VipVirtualLocker::defaultNumber(),
    ]);

    expect(fn () => app(EmergencyKeyService::class)->requestCode($vip))
        ->toThrow(EmergencyKeyNotEligibleException::class, 'taquilla física');

    $this->actingAs($vip)
        ->get(route('emergency-key.show'))
        ->assertRedirect(route('taquillas.index.client'))
        ->assertSessionHas('error', EmergencyKeyNotEligibleException::notPhysicalLocker()->getMessage());
});

test('al día siguiente el mismo socio puede volver a pedir la llave', function () {
    Carbon::setTestNow('2026-08-31 10:00:00');
    [$user] = l5bSocioConCandado();
    $service = app(EmergencyKeyService::class);

    $service->requestCode($user);
    EmergencyLockSetting::query()->firstOrFail()->update(['is_active' => true, 'current_code' => '9876']);

    Carbon::setTestNow('2026-09-01 10:00:00');

    $siguiente = $service->requestCode($user->fresh());
    expect($siguiente->code)->toBe('9876');

    Carbon::setTestNow();
});
