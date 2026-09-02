<?php

use App\Actions\Invoicing\IssueFiscalInvoiceAction;
use App\Enums\FiscalInvoiceStatus;
use App\Events\Payments\PaymentConfirmed;
use App\Exceptions\Invoicing\B2BRouterApiException;
use App\Jobs\Invoicing\CreateB2BRouterInvoiceJob;
use App\Models\FiscalInvoice;
use App\Models\Pedido;
use App\Models\User;
use App\Services\Invoicing\B2BRouterClient;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    config([
        'invoicing.enabled' => true,
        'invoicing.driver' => 'b2brouter',
        'invoicing.b2brouter.base_url' => 'https://api-staging.b2brouter.net',
        'invoicing.b2brouter.api_key' => 'fake-api-key',
        'invoicing.b2brouter.api_version' => '2025-10-13',
        'invoicing.b2brouter.account_id' => '999',
        'invoicing.poll.max_attempts' => 4,
        'invoicing.poll.backoff' => [1, 1, 1, 1],
    ]);
});

function fakePedidoPago(): array
{
    $user = User::factory()->create(['email' => 'cliente@example.com']);
    $pedido = Pedido::factory()->create([
        'user_id' => $user->id,
        'precio_total_cents' => 6000,
        'pagado' => true,
    ]);

    return [$user, $pedido];
}

test('flag OFF: PaymentConfirmed no crea ninguna fiscal_invoice ni llama a B2BRouter', function () {
    config(['invoicing.enabled' => false]);
    Http::fake();

    [, $pedido] = fakePedidoPago();

    event(new PaymentConfirmed(
        payableType: Pedido::class,
        payableId: $pedido->id,
        amountCents: 6000,
        stripeSessionId: 'cs_test_flag_off',
    ));

    expect(FiscalInvoice::query()->count())->toBe(0);
    Http::assertNothingSent();
});

test('flag ON: flujo completo create+poll deja la factura registered con identifier y qr', function () {
    [, $pedido] = fakePedidoPago();

    Http::fake([
        'https://api-staging.b2brouter.net/accounts/999/invoices' => Http::response([
            'invoice' => [
                'id' => 'inv_123',
                'state' => 'issued',
                'tax_report_ids' => ['tr_456'],
            ],
        ], 201),
        'https://api-staging.b2brouter.net/tax_reports/tr_456' => Http::sequence()
            ->push(['tax_report' => ['id' => 'tr_456', 'state' => 'processing']], 200)
            ->push([
                'tax_report' => [
                    'id' => 'tr_456',
                    'state' => 'registered',
                    'identifier' => 'TBAI-ABC123',
                    'qr' => 'https://tbai.example/qr/abc123',
                ],
            ], 200),
    ]);

    event(new PaymentConfirmed(
        payableType: Pedido::class,
        payableId: $pedido->id,
        amountCents: 6000,
        stripeSessionId: 'cs_test_happy_path',
    ));

    $invoice = FiscalInvoice::query()->where('stripe_checkout_session_id', 'cs_test_happy_path')->first();

    expect($invoice)->not->toBeNull()
        ->and($invoice->status)->toBe(FiscalInvoiceStatus::Registered)
        ->and($invoice->b2b_invoice_id)->toBe('inv_123')
        ->and($invoice->b2b_tax_report_id)->toBe('tr_456')
        ->and($invoice->tbai_identifier)->toBe('TBAI-ABC123')
        ->and($invoice->qr_payload)->toBe('https://tbai.example/qr/abc123')
        ->and($invoice->amount_cents)->toBe(6000);

    Http::assertSentCount(3); // 1 create + 2 sondeos (processing, registered)

    $create = collect(Http::recorded())
        ->first(fn (array $pair) => str_contains($pair[0]->url(), '/invoices') && $pair[0]->method() === 'POST');
    expect($create)->not->toBeNull();
    $price = data_get($create[0]->data(), 'invoice.invoice_lines_attributes.0.price');
    expect($price)->toBe(49.59); // 60,00 € IVA incl. → neto 49,59 €
    expect(recordedIdempotencyKey($create[0]))->toBe(
        B2BRouterClient::idempotencyKeyForSession('cs_test_happy_path')
    );
});

test('reintento del Job de creación no duplica factura ni repite la llamada de alta', function () {
    [, $pedido] = fakePedidoPago();

    Http::fake([
        'https://api-staging.b2brouter.net/accounts/999/invoices' => Http::response([
            'invoice' => ['id' => 'inv_777', 'state' => 'issued', 'tax_report_ids' => ['tr_888']],
        ], 201),
        'https://api-staging.b2brouter.net/tax_reports/tr_888' => Http::response([
            'tax_report' => ['id' => 'tr_888', 'state' => 'processing'],
        ], 200),
    ]);

    $job = new CreateB2BRouterInvoiceJob(
        payableType: Pedido::class,
        payableId: $pedido->id,
        amountCents: 6000,
        stripeSessionId: 'cs_test_retry',
    );

    $action = app(IssueFiscalInvoiceAction::class);

    $job->handle($action);
    $job->handle($action); // simula reintento del propio Job

    expect(FiscalInvoice::query()->where('stripe_checkout_session_id', 'cs_test_retry')->count())->toBe(1);

    // El alta en B2BRouter (POST /invoices) NUNCA se repite una vez creada la factura.
    // Los sondeos GET /tax_reports sí pueden repetirse entre llamadas (idempotentes por diseño).
    $createCalls = collect(Http::recorded())
        ->filter(fn (array $pair) => str_contains($pair[0]->url(), '/invoices'))
        ->count();

    expect($createCalls)->toBe(1);
});

test('5xx tras llegar a Hacienda + reintento: pending (no failed) y misma Idempotency-Key', function () {
    [, $pedido] = fakePedidoPago();
    $sessionId = 'cs_test_lost_response';

    Http::fake([
        'https://api-staging.b2brouter.net/accounts/999/invoices' => Http::sequence()
            ->push(['error' => 'upstream timeout after hacienda'], 503)
            ->push([
                'invoice' => ['id' => 'inv_once', 'state' => 'issued', 'tax_report_ids' => ['tr_once']],
            ], 201),
        'https://api-staging.b2brouter.net/tax_reports/tr_once' => Http::response([
            'tax_report' => ['id' => 'tr_once', 'state' => 'processing'],
        ], 200),
    ]);

    $job = new CreateB2BRouterInvoiceJob(
        payableType: Pedido::class,
        payableId: $pedido->id,
        amountCents: 6000,
        stripeSessionId: $sessionId,
    );
    $action = app(IssueFiscalInvoiceAction::class);

    expect(fn () => $job->handle($action))->toThrow(B2BRouterApiException::class);

    $invoice = FiscalInvoice::query()->where('stripe_checkout_session_id', $sessionId)->first();
    expect($invoice)->not->toBeNull()
        ->and($invoice->status)->toBe(FiscalInvoiceStatus::Pending)
        ->and($invoice->b2b_invoice_id)->toBeNull()
        ->and($invoice->last_error)->not->toBeNull();

    $job->handle($action);

    $invoice->refresh();
    expect($invoice->status)->toBe(FiscalInvoiceStatus::Processing)
        ->and($invoice->b2b_invoice_id)->toBe('inv_once');

    $posts = collect(Http::recorded())
        ->filter(fn (array $pair) => str_contains($pair[0]->url(), '/invoices') && $pair[0]->method() === 'POST');

    expect($posts)->toHaveCount(2);

    $keys = $posts->map(fn (array $pair) => recordedIdempotencyKey($pair[0]))->unique()->values();
    expect($keys)->toHaveCount(1)
        ->and($keys->first())->toBe(B2BRouterClient::idempotencyKeyForSession($sessionId));
});

test('error permanente 422 marca failed y el job no relanza ni re-POST', function () {
    [, $pedido] = fakePedidoPago();

    Http::fake([
        'https://api-staging.b2brouter.net/accounts/999/invoices' => Http::response([
            'errors' => ['contact' => 'invalid'],
        ], 422),
    ]);

    $job = new CreateB2BRouterInvoiceJob(
        payableType: Pedido::class,
        payableId: $pedido->id,
        amountCents: 6000,
        stripeSessionId: 'cs_test_permanent_422',
    );

    $job->handle(app(IssueFiscalInvoiceAction::class));

    $invoice = FiscalInvoice::query()->where('stripe_checkout_session_id', 'cs_test_permanent_422')->first();
    expect($invoice)->not->toBeNull()
        ->and($invoice->status)->toBe(FiscalInvoiceStatus::Failed)
        ->and($invoice->b2b_invoice_id)->toBeNull()
        ->and($invoice->last_error)->toContain('permanente');

    $createCalls = collect(Http::recorded())
        ->filter(fn (array $pair) => str_contains($pair[0]->url(), '/invoices') && $pair[0]->method() === 'POST')
        ->count();
    expect($createCalls)->toBe(1);
});

function recordedIdempotencyKey(object $request): string
{
    $header = $request->header(B2BRouterClient::IDEMPOTENCY_KEY_HEADER);
    if (is_array($header)) {
        return (string) ($header[0] ?? '');
    }

    return (string) $header;
}

test('payable sin datos fiscales suficientes marca la factura como failed sin llamar a B2BRouter', function () {
    Http::fake();

    event(new PaymentConfirmed(
        payableType: Pedido::class,
        payableId: 999999, // Pedido inexistente
        amountCents: 6000,
        stripeSessionId: 'cs_test_missing_data',
    ));

    $invoice = FiscalInvoice::query()->where('stripe_checkout_session_id', 'cs_test_missing_data')->first();

    expect($invoice)->not->toBeNull()
        ->and($invoice->status)->toBe(FiscalInvoiceStatus::Failed)
        ->and($invoice->last_error)->not->toBeNull();

    Http::assertNothingSent();
});

test('cliente propietario puede ver la factura fiscal y un tercero recibe 403', function () {
    $owner = User::factory()->create(['role' => 'user']);
    $other = User::factory()->create(['role' => 'user']);
    $pedido = Pedido::factory()->create(['user_id' => $owner->id, 'pagado' => true]);

    $invoice = FiscalInvoice::query()->create([
        'payable_type' => Pedido::class,
        'payable_id' => $pedido->id,
        'stripe_checkout_session_id' => 'cs_test_client_view',
        'amount_cents' => 6000,
        'status' => FiscalInvoiceStatus::Registered,
        'b2b_invoice_id' => 'inv_pdf_1',
        'tbai_identifier' => 'TBAI-XYZ',
        'qr_payload' => 'iVBORw0KGgo=',
    ]);

    $this->actingAs($owner)
        ->get(route('payments.fiscal-invoices.show', $invoice))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Payments/FiscalInvoice')
            ->where('invoice.tbai_identifier', 'TBAI-XYZ')
            ->where('invoice.is_ready', true)
            ->where('back_url', route('my-invoices.index'))
            ->where('pending_message', null)
        );

    $this->actingAs($other)
        ->get(route('payments.fiscal-invoices.show', $invoice))
        ->assertForbidden();
});

test('TicketBAI en proceso no promete el PDF en esta página', function () {
    $owner = User::factory()->create(['role' => 'user']);
    $pedido = Pedido::factory()->create(['user_id' => $owner->id, 'pagado' => true]);
    $invoice = FiscalInvoice::query()->create([
        'payable_type' => Pedido::class,
        'payable_id' => $pedido->id,
        'stripe_checkout_session_id' => 'cs_test_processing_page',
        'amount_cents' => 3261,
        'status' => FiscalInvoiceStatus::Processing,
        'b2b_invoice_id' => 'inv_processing_1',
    ]);

    $this->actingAs($owner)
        ->get(route('payments.fiscal-invoices.show', $invoice))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Payments/FiscalInvoice')
            ->where('invoice.is_ready', false)
            ->where(
                'pending_message',
                'Hacienda aún no ha sellado el TicketBAI (código y QR). El PDF de la factura ya lo tienes en Mis facturas.',
            ));
});
