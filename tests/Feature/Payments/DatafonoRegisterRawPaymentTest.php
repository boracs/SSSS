<?php

declare(strict_types=1);

use App\Models\DatafonoPayment;
use App\Models\PaymentTerminal;
use App\Services\Payments\DatafonoPaymentReconciliationService;
use App\Support\BusinessDateTime;

beforeEach(function () {
    $this->terminal = PaymentTerminal::query()->create([
        'codigo' => 'tpv_reg_'.uniqid(),
        'nombre' => 'TPV register test',
        'activo' => true,
        'emite_ticketbai_propio' => true,
    ]);
    $this->service = app(DatafonoPaymentReconciliationService::class);
});

test('registerRawPayment con source manual_cash crea fila pending_review', function () {
    $payment = $this->service->registerRawPayment([
        'payment_terminal_id' => $this->terminal->id,
        'amount_cents' => 2500,
        'paid_at' => BusinessDateTime::now(),
        'external_reference' => null,
        'source' => DatafonoPayment::SOURCE_MANUAL_CASH,
    ]);

    expect($payment->status)->toBe(DatafonoPayment::STATUS_PENDING_REVIEW)
        ->and($payment->source)->toBe(DatafonoPayment::SOURCE_MANUAL_CASH)
        ->and((int) $payment->amount_cents)->toBe(2500)
        ->and($payment->external_reference)->toBeNull();
});

test('registerRawPayment source=tpv con la misma external_reference es idempotente', function () {
    $payload = [
        'payment_terminal_id' => $this->terminal->id,
        'amount_cents' => 4500,
        'paid_at' => BusinessDateTime::now(),
        'external_reference' => 'TPV-AUTH-IDEMP-001',
        'source' => DatafonoPayment::SOURCE_TPV,
        'raw_payload' => ['auth' => '001'],
    ];

    $first = $this->service->registerRawPayment($payload);
    $second = $this->service->registerRawPayment($payload);

    expect($second->id)->toBe($first->id)
        ->and($first->source)->toBe(DatafonoPayment::SOURCE_TPV)
        ->and(DatafonoPayment::query()->where('external_reference', 'TPV-AUTH-IDEMP-001')->count())->toBe(1);
});
