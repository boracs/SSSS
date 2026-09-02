<?php

declare(strict_types=1);

use App\Events\Payments\PaymentConfirmed;
use App\Http\Controllers\Payments\PaymentWebhookController;
use App\Models\Booking;
use App\Models\PaymentWebhookIdempotency;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Log;

/**
 * El webhook de Stripe es la única confirmación de un cobro online. Responder 200 a un
 * fallo que se resolvería solo hace que Stripe dé el evento por entregado y no reintente:
 * el cliente queda cobrado y el pedido en `pending` para siempre. De ahí la distinción
 * entre fallo transitorio (5xx, que reintente) y definitivo (200 + alerta).
 */
const WEBHOOK_SECRET = 'whsec_test_maider';

beforeEach(function () {
    config()->set('services.stripe.webhook_secret', WEBHOOK_SECRET);
});

/**
 * Firma el payload igual que Stripe: HMAC-SHA256 sobre "timestamp.payload".
 */
function stripeWebhook(array $session, string $type = 'checkout.session.completed'): array
{
    $payload = json_encode([
        'id'      => 'evt_test_'.bin2hex(random_bytes(6)),
        'object'  => 'event',
        'type'    => $type,
        'data'    => ['object' => array_merge([
            'id'     => 'cs_test_default',
            'object' => 'checkout.session',
        ], $session)],
    ], JSON_THROW_ON_ERROR);

    $timestamp = time();
    $signature = hash_hmac('sha256', "{$timestamp}.{$payload}", WEBHOOK_SECRET);

    return [$payload, "t={$timestamp},v1={$signature}"];
}

function postStripeWebhook(array $session, string $type = 'checkout.session.completed')
{
    [$payload, $signature] = stripeWebhook($session, $type);

    return test()->call(
        method: 'POST',
        uri: '/webhooks/stripe',
        server: ['HTTP_STRIPE_SIGNATURE' => $signature, 'CONTENT_TYPE' => 'application/json'],
        content: $payload,
    );
}

function pendingIntent(string $transactionId, string $payableType, int $payableId, int $amountCents, string $token = ''): PaymentWebhookIdempotency
{
    return PaymentWebhookIdempotency::query()->create([
        'transaction_id'    => $transactionId,
        'payable_type'      => $payableType,
        'payable_id'        => $payableId,
        'amount'            => $amountCents,
        'status'            => 'pending',
        'idempotency_token' => $token !== '' ? $token : null,
    ]);
}

test('una firma inválida se rechaza con 400 y no toca nada', function () {
    $booking = Booking::factory()->create(['total_price' => 16, 'deposit_amount' => 4.8]);
    pendingIntent('cs_test_firma', Booking::class, $booking->id, 480);

    $response = $this->call(
        method: 'POST',
        uri: '/webhooks/stripe',
        server: ['HTTP_STRIPE_SIGNATURE' => 't=1,v1=falsificada', 'CONTENT_TYPE' => 'application/json'],
        content: json_encode(['type' => 'checkout.session.completed']),
    );

    $response->assertStatus(400);
    expect(PaymentWebhookIdempotency::query()->where('transaction_id', 'cs_test_firma')->value('status'))
        ->toBe('pending');
});

test('un cobro correcto confirma el payable y emite PaymentConfirmed una sola vez', function () {
    Event::fake([PaymentConfirmed::class]);

    $booking = Booking::factory()->create(['total_price' => 16, 'deposit_amount' => 4.8]);
    pendingIntent('cs_test_ok', Booking::class, $booking->id, 480);

    postStripeWebhook(['id' => 'cs_test_ok', 'amount_total' => 480])->assertOk();

    expect($booking->fresh()->payment_status)->toBe(\App\Enums\PaymentStatus::Confirmed->value);
    Event::assertDispatchedTimes(PaymentConfirmed::class, 1);
});

test('el reenvío del mismo evento responde 200 sin volver a emitir el evento', function () {
    $booking = Booking::factory()->create(['total_price' => 16, 'deposit_amount' => 4.8]);
    pendingIntent('cs_test_dup', Booking::class, $booking->id, 480);

    postStripeWebhook(['id' => 'cs_test_dup', 'amount_total' => 480])->assertOk();

    Event::fake([PaymentConfirmed::class]);
    postStripeWebhook(['id' => 'cs_test_dup', 'amount_total' => 480])->assertOk();

    Event::assertNotDispatched(PaymentConfirmed::class);
});

test('un payable eliminado o inexistente es fallo permanente y deja alerta', function () {
    Log::spy();

    pendingIntent('cs_test_deleted', Booking::class, 999_999, 480);

    postStripeWebhook(['id' => 'cs_test_deleted', 'amount_total' => 480])->assertOk();

    expect(PaymentWebhookIdempotency::query()->where('transaction_id', 'cs_test_deleted')->value('status'))
        ->toBe('pending');
    Log::shouldHaveReceived('critical')
        ->withArgs(fn (string $message, array $context = []) => ($context['alert'] ?? null) === PaymentWebhookController::ALERT_PERMANENT_FAILURE)
        ->once();
});

test('un importe inferior al esperado no pide reintento y deja alerta', function () {
    Log::spy();

    $booking = Booking::factory()->create(['total_price' => 16, 'deposit_amount' => 4.8]);
    pendingIntent('cs_test_importe', Booking::class, $booking->id, 480);

    postStripeWebhook(['id' => 'cs_test_importe', 'amount_total' => 120])->assertOk();

    expect($booking->fresh()->payment_status)->not->toBe(\App\Enums\PaymentStatus::Confirmed->value);
    Log::shouldHaveReceived('critical')
        ->withArgs(fn (string $message, array $context = []) => ($context['alert'] ?? null) === PaymentWebhookController::ALERT_PERMANENT_FAILURE)
        ->once();
});

test('un token de idempotencia que no coincide no pide reintento y deja alerta', function () {
    Log::spy();

    $booking = Booking::factory()->create(['total_price' => 16, 'deposit_amount' => 4.8]);
    pendingIntent('cs_test_token', Booking::class, $booking->id, 480, 'token-bueno');

    postStripeWebhook([
        'id'           => 'cs_test_token',
        'amount_total' => 480,
        'metadata'     => ['idempotency_token' => 'token-robado'],
    ])->assertOk();

    expect($booking->fresh()->payment_status)->not->toBe(\App\Enums\PaymentStatus::Confirmed->value);
    Log::shouldHaveReceived('critical')
        ->withArgs(fn (string $message, array $context = []) => ($context['alert'] ?? null) === PaymentWebhookController::ALERT_PERMANENT_FAILURE)
        ->once();
});

test('un evento de otro tipo se ignora con 200', function () {
    postStripeWebhook(['id' => 'cs_test_otro'], 'payment_intent.created')->assertOk();
});
