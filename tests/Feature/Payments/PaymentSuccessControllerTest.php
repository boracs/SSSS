<?php

declare(strict_types=1);

use App\Events\Payments\PaymentConfirmed;
use App\Models\PaymentWebhookIdempotency;
use App\Models\Pedido;
use Illuminate\Support\Facades\Event;

test('pago/exito reemite PaymentConfirmed con parámetros con nombre sin 500', function () {
    Event::fake([PaymentConfirmed::class]);

    $pedido = Pedido::factory()->create(['pagado' => true, 'precio_total_cents' => 6000]);

    PaymentWebhookIdempotency::query()->create([
        'transaction_id' => 'cs_test_success_named',
        'idempotency_token' => 'tok_success_named',
        'payable_type' => Pedido::class,
        'payable_id' => $pedido->id,
        'amount' => 60.00,
        'status' => 'processed',
    ]);

    $this->get('/pago/exito?session_id=cs_test_success_named')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Payments/Success')
            ->where('status', 'processed')
            ->where('payableId', $pedido->id));

    Event::assertDispatched(PaymentConfirmed::class, function (PaymentConfirmed $event) use ($pedido) {
        return $event->payableType === Pedido::class
            && $event->payableId === $pedido->id
            && $event->stripeSessionId === 'cs_test_success_named';
    });
});
