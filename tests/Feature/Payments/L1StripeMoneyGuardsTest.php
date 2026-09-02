<?php

declare(strict_types=1);

use App\Actions\Academy\DenyEnrollmentQuotaAction;
use App\Actions\Payments\InitiatePaymentAction;
use App\DTOs\Payments\InitiatePaymentDto;
use App\DTOs\Payments\PaymentLineItemDto;
use App\Enums\PaymentStatus;
use App\Http\Controllers\Payments\PaymentWebhookController;
use App\Models\Booking;
use App\Models\Lesson;
use App\Models\LessonUser;
use App\Models\PagoCuota;
use App\Models\PaymentWebhookIdempotency;
use App\Models\PlanTaquilla;
use App\Models\Surfboard;
use App\Models\User;
use App\Models\UserBono;
use App\Services\Payments\PaymentGatewayService;
use App\Support\BusinessDateTime;
use Illuminate\Support\Facades\Log;

function l1Lesson(array $overrides = []): Lesson
{
    $start = BusinessDateTime::now()->addDay()->setTime(9, 0);

    return Lesson::query()->create(array_merge([
        'title' => 'Grupal L1',
        'starts_at' => $start,
        'ends_at' => $start->copy()->addHours(2),
        'type' => Lesson::TYPE_SURF,
        'modality' => Lesson::MODALITY_GRUPAL,
        'level' => Lesson::LEVEL_INICIACION,
        'max_slots' => 12,
        'price' => 40.00,
        'status' => Lesson::STATUS_SCHEDULED,
    ], $overrides));
}

function l1PayDto(string $type, int $id, int $cents = 1000): InitiatePaymentDto
{
    return new InitiatePaymentDto(
        payableType: $type,
        payableId: $id,
        lineItems: [new PaymentLineItemDto(name: 'Test', description: 'L1', unitAmountCents: $cents, quantity: 1)],
        successPath: '/pago/exito',
        cancelPath: '/academia',
        customerEmail: 'l1@example.test',
    );
}

test('InitiatePaymentAction reutiliza la sesión abierta del mismo payable', function () {
    $user = User::factory()->create();
    $enrollment = LessonUser::query()->create([
        'lesson_id' => l1Lesson()->id,
        'user_id' => $user->id,
        'party_size' => 1,
        'quantity' => 1,
        'status' => LessonUser::STATUS_PENDING,
        'payment_status' => PaymentStatus::Pending->value,
        'payment_method' => 'card',
    ]);

    PaymentWebhookIdempotency::query()->create([
        'transaction_id' => 'cs_test_reuse',
        'payable_type' => LessonUser::class,
        'payable_id' => $enrollment->id,
        'amount' => 4000,
        'status' => 'pending',
        'checkout_url' => 'https://checkout.stripe.test/reuse',
        'expires_at' => now()->addHour(),
    ]);

    $url = app(InitiatePaymentAction::class)->execute(l1PayDto(LessonUser::class, (int) $enrollment->id, 4000));

    expect($url)->toBe('https://checkout.stripe.test/reuse');
});

test('el doble POST de cuota reutiliza la misma URL de checkout', function () {
    $user = User::factory()->create(['numeroTaquilla' => 210]);
    $plan = PlanTaquilla::factory()->create(['duracion_dias' => 90, 'activo' => true]);
    $pago = app(\App\Services\Taquilla\TaquillaMembershipService::class)
        ->createPendingPaymentForCheckout($user, (int) $plan->id);

    PaymentWebhookIdempotency::query()->create([
        'transaction_id' => 'cs_test_cuota',
        'payable_type' => PagoCuota::class,
        'payable_id' => $pago->id,
        'amount' => (int) $pago->monto_pagado_cents,
        'status' => 'pending',
        'checkout_url' => 'https://checkout.stripe.test/cuota',
        'expires_at' => now()->addHour(),
    ]);

    $this->actingAs($user);
    $first = $this->post(route('taquillas.pago.pay', $pago));
    $second = $this->post(route('taquillas.pago.pay', $pago));

    $first->assertRedirect('https://checkout.stripe.test/cuota');
    $second->assertRedirect('https://checkout.stripe.test/cuota');
    expect(PaymentWebhookIdempotency::query()->where('payable_type', PagoCuota::class)->where('payable_id', $pago->id)->count())
        ->toBe(1);
});

test('el doble clic de alquiler reutiliza la misma URL', function () {
    $user = User::factory()->create();
    $board = Surfboard::factory()->create();
    $booking = Booking::factory()->create([
        'user_id' => $user->id,
        'surfboard_id' => $board->id,
        'total_price' => 20,
        'deposit_amount' => 6,
        'payment_status' => PaymentStatus::Pending->value,
    ]);

    PaymentWebhookIdempotency::query()->create([
        'transaction_id' => 'cs_test_rental',
        'payable_type' => Booking::class,
        'payable_id' => $booking->id,
        'amount' => 600,
        'status' => 'pending',
        'checkout_url' => 'https://checkout.stripe.test/rental',
        'expires_at' => now()->addHour(),
    ]);

    $this->actingAs($user);
    $this->post(route('my-reservations.rental.pay', $booking))
        ->assertRedirect('https://checkout.stripe.test/rental');
    $this->post(route('my-reservations.rental.pay', $booking))
        ->assertRedirect('https://checkout.stripe.test/rental');
});

test('requestLesson con cupo extra no abre checkout', function () {
    $user = User::factory()->create(['role' => 'user']);
    $lesson = l1Lesson();

    $this->actingAs($user)
        ->from('/academia')
        ->post(route('academy.lessons.request', $lesson), [
            'party_size' => 1,
            'request_extra_monitor' => 1,
            'participants' => [['first_name' => 'Ane', 'last_name' => 'L1']],
        ])
        ->assertRedirect('/academia')
        ->assertSessionHas('success');

    expect(LessonUser::query()->where('lesson_id', $lesson->id)->where('user_id', $user->id)->value('status'))
        ->toBe(LessonUser::STATUS_PENDING_EXTRA_MONITOR)
        ->and(PaymentWebhookIdempotency::query()->count())->toBe(0);
});

test('pagar cupo extra no confirma la plaza hasta que el admin aprueba', function () {
    $user = User::factory()->create();
    $enrollment = LessonUser::query()->create([
        'lesson_id' => l1Lesson()->id,
        'user_id' => $user->id,
        'party_size' => 1,
        'quantity' => 1,
        'status' => LessonUser::STATUS_PENDING_EXTRA_MONITOR,
        'payment_status' => PaymentStatus::Pending->value,
        'payment_method' => 'card',
    ]);

    PaymentWebhookIdempotency::query()->create([
        'transaction_id' => 'cs_test_extra',
        'payable_type' => LessonUser::class,
        'payable_id' => $enrollment->id,
        'amount' => 4000,
        'status' => 'pending',
        'idempotency_token' => null,
    ]);

    $out = app(PaymentGatewayService::class)->confirmPaymentFromWebhook('cs_test_extra', 4000);

    expect($out['ok'])->toBeTrue()
        ->and($enrollment->fresh()->status)->toBe(LessonUser::STATUS_PENDING_EXTRA_MONITOR)
        ->and($enrollment->fresh()->payment_status)->toBe(PaymentStatus::Confirmed->value);
});

test('payPending no ofrece tarjeta a una plaza extra ni a bono VIP con saldo', function () {
    $user = User::factory()->create();
    $lesson = l1Lesson();
    LessonUser::query()->create([
        'lesson_id' => $lesson->id,
        'user_id' => $user->id,
        'party_size' => 1,
        'quantity' => 1,
        'status' => LessonUser::STATUS_PENDING_EXTRA_MONITOR,
        'payment_status' => PaymentStatus::Pending->value,
        'payment_method' => 'card',
    ]);

    $this->actingAs($user)
        ->from('/academia')
        ->post(route('academy.lessons.pay', $lesson))
        ->assertRedirect('/academia')
        ->assertSessionHas('error');

    $vip = User::factory()->create();
    $vipLesson = l1Lesson(['title' => 'VIP L1']);
    LessonUser::query()->create([
        'lesson_id' => $vipLesson->id,
        'user_id' => $vip->id,
        'party_size' => 1,
        'quantity' => 1,
        'status' => LessonUser::STATUS_PENDING,
        'payment_status' => PaymentStatus::Pending->value,
        'payment_method' => 'bono_vip',
    ]);
    UserBono::query()->create([
        'user_id' => $vip->id,
        'pack_id' => \App\Models\PackBono::query()->create([
            'nombre' => 'Bono 5',
            'num_clases' => 5,
            'precio' => 150,
        ])->id,
        'clases_restantes' => 3,
        'status' => UserBono::STATUS_CONFIRMED,
    ]);

    $this->actingAs($vip)
        ->from('/academia')
        ->post(route('academy.lessons.pay', $vipLesson))
        ->assertRedirect('/academia')
        ->assertSessionHas('error');
});

test('denegar un cupo extra pagado con tarjeta reembolsa el PaymentIntent original', function () {
    config(['services.stripe.secret' => 'sk_test_fake']);

    $user = User::factory()->create();
    $enrollment = LessonUser::query()->create([
        'lesson_id' => l1Lesson()->id,
        'user_id' => $user->id,
        'party_size' => 1,
        'quantity' => 1,
        'status' => LessonUser::STATUS_PENDING_EXTRA_MONITOR,
        'payment_status' => PaymentStatus::Confirmed->value,
        'payment_method' => 'card',
    ]);

    PaymentWebhookIdempotency::query()->create([
        'transaction_id' => 'cs_test_refund_extra',
        'payable_type' => LessonUser::class,
        'payable_id' => $enrollment->id,
        'amount' => 4000,
        'status' => 'processed',
    ]);

    $probe = (object) ['refunds' => []];
    \Stripe\ApiRequestor::setHttpClient(new class($probe) implements \Stripe\HttpClient\ClientInterface
    {
        public function __construct(private object $probe) {}

        public function request($method, $absUrl, $headers, $params, $hasFile, $apiMode = 'v1', $maxNetworkRetries = null)
        {
            if (str_contains((string) $absUrl, '/refunds')) {
                $this->probe->refunds[] = is_array($params) ? ($params['payment_intent'] ?? null) : null;

                return [json_encode(['id' => 're_test', 'object' => 'refund', 'payment_intent' => 'pi_test_original']), 200, []];
            }

            return [json_encode([
                'id' => 'cs_test_refund_extra',
                'object' => 'checkout.session',
                'payment_intent' => 'pi_test_original',
            ]), 200, []];
        }
    });

    try {
        $out = app(DenyEnrollmentQuotaAction::class)->execute($enrollment->fresh());
    } finally {
        \Stripe\ApiRequestor::setHttpClient(null);
    }

    expect($out['ok'])->toBeTrue()
        ->and($enrollment->fresh()->status)->toBe(LessonUser::STATUS_CANCELLED)
        ->and($probe->refunds)->toBe(['pi_test_original']);
});

test('webhook de PagoCuota borrado no pide reintento y deja alerta', function () {
    config()->set('services.stripe.webhook_secret', 'whsec_test_maider');
    Log::spy();

    $user = User::factory()->create(['numeroTaquilla' => 211]);
    $plan = PlanTaquilla::factory()->create(['duracion_dias' => 90, 'activo' => true]);
    $pago = app(\App\Services\Taquilla\TaquillaMembershipService::class)
        ->createPendingPaymentForCheckout($user, (int) $plan->id);
    $pagoId = (int) $pago->id;

    PaymentWebhookIdempotency::query()->create([
        'transaction_id' => 'cs_test_purged',
        'payable_type' => PagoCuota::class,
        'payable_id' => $pagoId,
        'amount' => (int) $pago->monto_pagado_cents,
        'status' => 'pending',
    ]);
    $pago->delete();

    $payload = json_encode([
        'id' => 'evt_purged',
        'object' => 'event',
        'type' => 'checkout.session.completed',
        'data' => ['object' => [
            'id' => 'cs_test_purged',
            'object' => 'checkout.session',
            'amount_total' => (int) $pago->monto_pagado_cents,
        ]],
    ], JSON_THROW_ON_ERROR);
    $timestamp = time();
    $signature = hash_hmac('sha256', "{$timestamp}.{$payload}", 'whsec_test_maider');

    $this->call(
        method: 'POST',
        uri: '/webhooks/stripe',
        server: ['HTTP_STRIPE_SIGNATURE' => "t={$timestamp},v1={$signature}", 'CONTENT_TYPE' => 'application/json'],
        content: $payload,
    )->assertOk();

    Log::shouldHaveReceived('critical')
        ->withArgs(fn (string $message, array $context = []) => ($context['alert'] ?? null) === PaymentWebhookController::ALERT_PERMANENT_FAILURE)
        ->once();
});
