<?php

declare(strict_types=1);

use App\Models\DatafonoPayment;
use App\Models\PaymentTerminal;

const DATAFONO_TEST_SECRET = 'test-secret-datafono';

function datafonoSignedPost(\Illuminate\Foundation\Testing\TestCase $testCase, string $uri, array $payload, ?string $secretOverride = null): \Illuminate\Testing\TestResponse
{
    $body = json_encode($payload);
    $secret = $secretOverride ?? DATAFONO_TEST_SECRET;
    $signature = hash_hmac('sha256', $body, $secret);

    return $testCase->call(
        'POST',
        $uri,
        [],
        [],
        [],
        [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X-Datafono-Signature' => $signature,
        ],
        $body,
    );
}

beforeEach(function () {
    config(['services.datafono.ingest_secret' => DATAFONO_TEST_SECRET]);
    config(['services.datafono.ingest_enabled' => true]);

    $this->terminal = PaymentTerminal::query()->create([
        'codigo' => 'tpv_ingest_'.uniqid(),
        'nombre' => 'TPV ingest test',
        'activo' => true,
        'emite_ticketbai_propio' => true,
    ]);
    config(['services.datafono.default_terminal_codigo' => $this->terminal->codigo]);
});

test('POST firmado válido con payload completo crea DatafonoPayment source=tpv pending_review', function () {
    $payload = [
        'amount_cents' => 3500,
        'paid_at' => now()->toIso8601String(),
        'external_reference' => 'TPV-WEBHOOK-001',
        'terminal_codigo' => $this->terminal->codigo,
    ];

    $response = datafonoSignedPost($this, '/webhooks/datafono/ingest', $payload);

    $response->assertStatus(200);

    $payment = DatafonoPayment::query()->where('external_reference', 'TPV-WEBHOOK-001')->first();
    expect($payment)->not->toBeNull()
        ->and($payment->source)->toBe(DatafonoPayment::SOURCE_TPV)
        ->and($payment->status)->toBe(DatafonoPayment::STATUS_PENDING_REVIEW)
        ->and((int) $payment->amount_cents)->toBe(3500);
});

test('mismo external_reference dos veces con firma válida devuelve 200 ambas y crea 1 sola fila', function () {
    $payload = [
        'amount_cents' => 1200,
        'paid_at' => now()->toIso8601String(),
        'external_reference' => 'TPV-WEBHOOK-IDEMP-001',
        'terminal_codigo' => $this->terminal->codigo,
    ];

    $first = datafonoSignedPost($this, '/webhooks/datafono/ingest', $payload);
    $second = datafonoSignedPost($this, '/webhooks/datafono/ingest', $payload);

    $first->assertStatus(200);
    $second->assertStatus(200);

    expect(DatafonoPayment::query()->where('external_reference', 'TPV-WEBHOOK-IDEMP-001')->count())->toBe(1);
});

test('firma inválida devuelve 401 y no crea filas', function () {
    $payload = [
        'amount_cents' => 1000,
        'paid_at' => now()->toIso8601String(),
        'external_reference' => 'TPV-WEBHOOK-BADSIG-001',
    ];

    $response = datafonoSignedPost($this, '/webhooks/datafono/ingest', $payload, 'wrong-secret');

    $response->assertStatus(401);
    expect(DatafonoPayment::query()->where('external_reference', 'TPV-WEBHOOK-BADSIG-001')->count())->toBe(0);
});

test('payload sin amount_cents devuelve 422 y no crea filas', function () {
    $payload = [
        'paid_at' => now()->toIso8601String(),
        'external_reference' => 'TPV-WEBHOOK-NOAMOUNT-001',
    ];

    $response = datafonoSignedPost($this, '/webhooks/datafono/ingest', $payload);

    $response->assertStatus(422);
    expect(DatafonoPayment::query()->where('external_reference', 'TPV-WEBHOOK-NOAMOUNT-001')->count())->toBe(0);
});

test('payload sin external_reference devuelve 422 y no crea filas', function () {
    $payload = [
        'amount_cents' => 900,
        'paid_at' => now()->toIso8601String(),
    ];

    $response = datafonoSignedPost($this, '/webhooks/datafono/ingest', $payload);

    $response->assertStatus(422);
    expect(DatafonoPayment::query()->count())->toBe(0);
});

test('ingesta deshabilitada devuelve 503', function () {
    config(['services.datafono.ingest_enabled' => false]);

    $payload = [
        'amount_cents' => 500,
        'paid_at' => now()->toIso8601String(),
        'external_reference' => 'TPV-WEBHOOK-DISABLED-001',
    ];

    $response = datafonoSignedPost($this, '/webhooks/datafono/ingest', $payload);

    $response->assertStatus(503);
});
