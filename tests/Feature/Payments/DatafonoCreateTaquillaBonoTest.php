<?php

declare(strict_types=1);

use App\Models\DatafonoPayment;
use App\Models\PackBono;
use App\Models\PagoCuota;
use App\Models\PaymentTerminal;
use App\Models\PlanTaquilla;
use App\Models\User;
use App\Models\UserBono;
use App\Services\Payments\DatafonoPaymentReconciliationService;
use App\Support\BusinessDateTime;
use Illuminate\Validation\ValidationException;

beforeEach(function () {
    $this->terminal = PaymentTerminal::query()->create([
        'codigo' => 'tpv_3b_'.uniqid(),
        'nombre' => 'TPV tanda 3b',
        'activo' => true,
        'emite_ticketbai_propio' => true,
    ]);

    $this->service = app(DatafonoPaymentReconciliationService::class);
});

function pendingCobro3b(PaymentTerminal $terminal, int $amountCents): DatafonoPayment
{
    return DatafonoPayment::query()->create([
        'payment_terminal_id' => $terminal->id,
        'amount_cents' => $amountCents,
        'paid_at' => BusinessDateTime::now(),
        'status' => DatafonoPayment::STATUS_PENDING_REVIEW,
    ]);
}

test('reconcile taquilla nueva crea PagoCuota confirmado y asigna datáfono', function () {
    $user = User::factory()->create([
        'role' => 'user',
        'numeroTaquilla' => 42,
    ]);
    $plan = PlanTaquilla::factory()->create([
        'nombre' => 'Mensual datáfono',
        'precio_total_cents' => 4500,
        'duracion_dias' => 30,
        'activo' => true,
    ]);
    $payment = pendingCobro3b($this->terminal, 4500);

    $result = $this->service->reconcile($payment, $user, [
        'category' => 'taquilla',
        'plan_taquilla_id' => $plan->id,
        'reviewed_by' => $user->id,
    ]);

    expect($result->status)->toBe(DatafonoPayment::STATUS_ASSIGNED)
        ->and($result->payable_type)->toBe(PagoCuota::class)
        ->and($result->assigned_user_id)->toBe($user->id);

    $pago = PagoCuota::query()->findOrFail($result->payable_id);
    expect($pago->status)->toBe(PagoCuota::STATUS_CONFIRMED)
        ->and($pago->user_id)->toBe($user->id)
        ->and((int) $pago->id_plan_pagado)->toBe($plan->id)
        ->and((int) $pago->monto_pagado_cents)->toBe(4500)
        ->and($pago->payment_method)->toBe('datafono');
});

test('reconcile bono nuevo crea UserBono confirmado y asigna datáfono', function () {
    $user = User::factory()->create(['role' => 'user']);
    $pack = PackBono::query()->create([
        'nombre' => 'Pack 5 datáfono',
        'num_clases' => 5,
        'precio' => 75.00,
        'activo' => true,
    ]);
    $payment = pendingCobro3b($this->terminal, 7500);

    $result = $this->service->reconcile($payment, $user, [
        'category' => 'bono',
        'pack_bono_id' => $pack->id,
        'reviewed_by' => $user->id,
    ]);

    expect($result->status)->toBe(DatafonoPayment::STATUS_ASSIGNED)
        ->and($result->payable_type)->toBe(UserBono::class)
        ->and($result->assigned_user_id)->toBe($user->id);

    $bono = UserBono::query()->findOrFail($result->payable_id);
    expect($bono->status)->toBe(UserBono::STATUS_CONFIRMED)
        ->and($bono->user_id)->toBe($user->id)
        ->and((int) $bono->pack_id)->toBe($pack->id)
        ->and((int) $bono->clases_restantes)->toBe(5);
});

test('sin user_id y con plan_taquilla_id lanza ValidationException', function () {
    $plan = PlanTaquilla::factory()->create([
        'precio_total_cents' => 3000,
        'activo' => true,
    ]);
    $payment = pendingCobro3b($this->terminal, 3000);

    expect(fn () => $this->service->reconcile($payment, null, [
        'category' => 'taquilla',
        'plan_taquilla_id' => $plan->id,
    ]))->toThrow(ValidationException::class);

    expect($payment->fresh()->status)->toBe(DatafonoPayment::STATUS_PENDING_REVIEW)
        ->and(PagoCuota::query()->where('id_plan_pagado', $plan->id)->count())->toBe(0);
});
