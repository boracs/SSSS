<?php

declare(strict_types=1);

use App\Models\Booking;
use App\Models\PaymentWebhookIdempotency;
use App\Services\Payments\PaymentGatewayService;

/**
 * Stripe solo cobra el depósito de un alquiler (30 % por defecto). Al confirmar
 * ese pago, el resto (total - depósito) debe quedar marcado como pendiente de
 * cobrar en mostrador ({@see Booking::BALANCE_PENDING}), salvo que el importe
 * ya cubra el total (prepago íntegro / caso legado).
 */
test('confirmar el depósito online deja el resto pendiente si no cubre el total', function () {
    $booking = Booking::factory()->create([
        'total_price' => 16,
        'deposit_amount' => 4.8,
    ]);

    PaymentWebhookIdempotency::query()->create([
        'transaction_id' => 'cs_test_deposito',
        'payable_type' => Booking::class,
        'payable_id' => $booking->id,
        'amount' => 480,
        'status' => 'pending',
    ]);

    $result = app(PaymentGatewayService::class)->confirmPaymentFromWebhook('cs_test_deposito', 480);

    expect($result['ok'])->toBeTrue();

    $booking->refresh();
    expect($booking->payment_status)->toBe(Booking::PAYMENT_CONFIRMED)
        ->and($booking->status)->toBe(Booking::STATUS_CONFIRMED)
        ->and($booking->balance_status)->toBe(Booking::BALANCE_PENDING)
        ->and($booking->hasBalanceDue())->toBeTrue()
        ->and($booking->remainingBalanceCents())->toBe(1120);
});

test('confirmar un alquiler prepagado íntegro no deja resto pendiente', function () {
    $booking = Booking::factory()->create([
        'total_price' => 16,
        'deposit_amount' => 16,
    ]);

    PaymentWebhookIdempotency::query()->create([
        'transaction_id' => 'cs_test_integro',
        'payable_type' => Booking::class,
        'payable_id' => $booking->id,
        'amount' => 1600,
        'status' => 'pending',
    ]);

    app(PaymentGatewayService::class)->confirmPaymentFromWebhook('cs_test_integro', 1600);

    $booking->refresh();
    expect($booking->balance_status)->toBe(Booking::BALANCE_NONE)
        ->and($booking->hasBalanceDue())->toBeFalse()
        ->and($booking->remainingBalanceCents())->toBe(0);
});
