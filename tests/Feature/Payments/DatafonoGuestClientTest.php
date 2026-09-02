<?php

declare(strict_types=1);

use App\Enums\FiscalInvoiceStatus;
use App\Models\DatafonoPayment;
use App\Models\FiscalInvoice;
use App\Models\PaymentTerminal;
use App\Models\Pedido;
use App\Models\PhotoSession;
use App\Models\PhotoSessionBooking;
use App\Models\Producto;
use App\Services\Payments\DatafonoPaymentReconciliationService;
use App\Support\BusinessDateTime;
use App\Support\MoneyCents;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;

beforeEach(function () {
    $this->service = app(DatafonoPaymentReconciliationService::class);
    $this->terminal = PaymentTerminal::query()->first()
        ?? PaymentTerminal::query()->create([
            'codigo' => 'guest_tpv_'.uniqid(),
            'nombre' => 'TPV guest test',
            'activo' => true,
            'emite_ticketbai_propio' => true,
        ]);
});

function guestPendingCobro(PaymentTerminal $terminal, int $amountCents): DatafonoPayment
{
    return DatafonoPayment::query()->create([
        'payment_terminal_id' => $terminal->id,
        'amount_cents' => $amountCents,
        'paid_at' => BusinessDateTime::now(),
        'status' => DatafonoPayment::STATUS_PENDING_REVIEW,
    ]);
}

test('producto con guest_name sin socio crea pedido y listPayments muestra Cliente no registrado', function () {
    $producto = Producto::factory()->create([
        'nombre' => 'Parafina guest',
        'precio' => 10.00,
        'descuento' => 0,
        'unidades' => 3,
        'eliminado' => false,
    ]);
    $amountCents = MoneyCents::eurosToCents(10.00);
    $payment = guestPendingCobro($this->terminal, $amountCents);

    $result = $this->service->reconcile($payment, null, [
        'category' => 'producto',
        'product_ids' => [$producto->id],
        'guest_name' => 'Ana García',
        'guest_email' => 'ana.guest@example.test',
    ]);

    expect($result->status)->toBe(DatafonoPayment::STATUS_ASSIGNED)
        ->and($result->assigned_user_id)->toBeNull()
        ->and($result->payable_type)->toBe(Pedido::class);

    $pedido = Pedido::query()->findOrFail($result->payable_id);
    expect($pedido->user_id)->toBeNull()
        ->and($pedido->guest_name)->toBe('Ana García')
        ->and($pedido->guest_email)->toBe('ana.guest@example.test')
        ->and($pedido->displayName())->toBe('Ana García');

    $listed = collect($this->service->listPayments(DatafonoPayment::STATUS_ASSIGNED))
        ->firstWhere('id', $result->id);

    expect($listed)->not->toBeNull()
        ->and($listed['assigned_user_name'])->toBeNull()
        ->and($listed['guest_name'])->toBe('Ana García');
});

test('producto sin socio ni guest_name falla', function () {
    $producto = Producto::factory()->create([
        'precio' => 12.00,
        'descuento' => 0,
        'unidades' => 2,
        'eliminado' => false,
    ]);
    $payment = guestPendingCobro($this->terminal, MoneyCents::eurosToCents(12.00));

    expect(fn () => $this->service->reconcile($payment, null, [
        'category' => 'producto',
        'product_ids' => [$producto->id],
    ]))->toThrow(ValidationException::class);

    expect($payment->fresh()->status)->toBe(DatafonoPayment::STATUS_PENDING_REVIEW)
        ->and($producto->fresh()->unidades)->toBe(2);
});

test('fotos reserva nueva con guest_name sin socio guarda nombre y no queda vacío', function () {
    $session = PhotoSession::query()->create([
        'nombre' => 'Sesión guest datáfono',
        'descripcion' => null,
        'precio_cents' => 4500,
        'plus_por_persona_cents' => 0,
        'duracion_minutos' => 60,
        'activo' => true,
    ]);
    // base 4500 + (1 × 0) = 4500
    $amountCents = 4500;
    $payment = guestPendingCobro($this->terminal, $amountCents);
    $fecha = BusinessDateTime::now()->addDay()->format('Y-m-d H:i:s');

    $result = $this->service->reconcile($payment, null, [
        'category' => 'fotos',
        'photo_session_id' => $session->id,
        'fecha_inicio' => $fecha,
        'party_size' => 1,
        'guest_name' => 'Luis Pérez',
        'guest_email' => 'luis.guest@example.test',
    ]);

    expect($result->status)->toBe(DatafonoPayment::STATUS_ASSIGNED)
        ->and($result->assigned_user_id)->toBeNull()
        ->and($result->payable_type)->toBe(PhotoSessionBooking::class);

    $booking = PhotoSessionBooking::query()->findOrFail($result->payable_id);
    expect($booking->user_id)->toBeNull()
        ->and((bool) $booking->is_admin_guest)->toBeTrue()
        ->and($booking->guest_first_name)->toBe('Luis')
        ->and($booking->guest_last_name)->toBe('Pérez')
        ->and($booking->guest_email)->toBe('luis.guest@example.test')
        ->and($booking->displayName())->toBe('Luis Pérez');

    $listed = collect($this->service->listPayments(DatafonoPayment::STATUS_ASSIGNED))
        ->firstWhere('id', $result->id);

    expect($listed['guest_name'])->toBe('Luis Pérez');
});

function configureInvoicingForGuestTests(): void
{
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
}

test('INVOICING_ENABLED: pedido guest con email emite factura TicketBAI (no failed)', function () {
    configureInvoicingForGuestTests();
    Http::fake([
        'https://api-staging.b2brouter.net/accounts/999/invoices' => Http::response([
            'invoice' => ['id' => 'inv_guest_ok', 'state' => 'issued', 'tax_report_ids' => ['tr_guest_ok']],
        ], 201),
        'https://api-staging.b2brouter.net/tax_reports/tr_guest_ok' => Http::response([
            'tax_report' => ['id' => 'tr_guest_ok', 'state' => 'processing'],
        ], 200),
    ]);

    $producto = Producto::factory()->create([
        'nombre' => 'Parafina guest TBAI',
        'precio' => 10.00,
        'descuento' => 0,
        'unidades' => 3,
        'eliminado' => false,
    ]);
    $amountCents = MoneyCents::eurosToCents(10.00);
    $payment = guestPendingCobro($this->terminal, $amountCents);

    $result = $this->service->reconcile($payment, null, [
        'category' => 'producto',
        'product_ids' => [$producto->id],
        'guest_name' => 'Ana García',
        'guest_email' => 'ana.guest@example.test',
    ]);

    $pedido = Pedido::query()->findOrFail($result->payable_id);
    expect($pedido->user_id)->toBeNull()
        ->and($pedido->guest_name)->toBe('Ana García')
        ->and($pedido->guest_email)->toBe('ana.guest@example.test');

    $invoice = FiscalInvoice::query()
        ->where('payable_type', Pedido::class)
        ->where('payable_id', $pedido->id)
        ->first();

    expect($invoice)->not->toBeNull()
        ->and($invoice->status)->not->toBe(FiscalInvoiceStatus::Failed)
        ->and($invoice->b2b_invoice_id)->toBe('inv_guest_ok');

    $create = collect(Http::recorded())
        ->first(fn (array $pair) => $pair[0]->method() === 'POST' && str_contains($pair[0]->url(), '/invoices'));
    expect($create)->not->toBeNull();
    expect(data_get($create[0]->data(), 'invoice.contact.email'))->toBe('ana.guest@example.test')
        ->and(data_get($create[0]->data(), 'invoice.contact.name'))->toBe('Ana García');
});

test('INVOICING_ENABLED: pedido guest sin email marca factura failed (no 500) y no llama a B2B', function () {
    configureInvoicingForGuestTests();
    Http::fake();

    $producto = Producto::factory()->create([
        'nombre' => 'Parafina guest sin email',
        'precio' => 10.00,
        'descuento' => 0,
        'unidades' => 3,
        'eliminado' => false,
    ]);
    $amountCents = MoneyCents::eurosToCents(10.00);
    $payment = guestPendingCobro($this->terminal, $amountCents);

    $result = $this->service->reconcile($payment, null, [
        'category' => 'producto',
        'product_ids' => [$producto->id],
        'guest_name' => 'Ana García',
    ]);

    expect($result->status)->toBe(DatafonoPayment::STATUS_ASSIGNED);

    $invoice = FiscalInvoice::query()
        ->where('payable_type', Pedido::class)
        ->where('payable_id', $result->payable_id)
        ->first();

    expect($invoice)->not->toBeNull()
        ->and($invoice->status)->toBe(FiscalInvoiceStatus::Failed)
        ->and($invoice->last_error)->toContain('email')
        ->and($invoice->b2b_invoice_id)->toBeNull();

    Http::assertNothingSent();
});

test('INVOICING_ENABLED: POST cash guest sin email no cierra el ticket (422)', function () {
    configureInvoicingForGuestTests();
    Http::fake();

    $admin = \App\Models\User::factory()->create(['role' => 'admin']);
    $producto = Producto::factory()->create([
        'precio' => 10.00,
        'descuento' => 0,
        'unidades' => 3,
        'eliminado' => false,
    ]);
    $amountCents = MoneyCents::eurosToCents(10.00);

    $this->actingAs($admin)
        ->from(route('admin.payments.datafono.index'))
        ->post(route('admin.payments.datafono.store'), [
            'payment_terminal_id' => $this->terminal->id,
            'paid_at' => now()->toIso8601String(),
            'guest_name' => 'Ana García',
            'lines' => [[
                'category' => 'producto',
                'amount_cents' => $amountCents,
                'product_ids' => [$producto->id],
            ]],
        ])
        ->assertRedirect(route('admin.payments.datafono.index'))
        ->assertSessionHasErrors('guest_email');

    expect(Pedido::query()->count())->toBe(0)
        ->and(FiscalInvoice::query()->count())->toBe(0);
    Http::assertNothingSent();
});

test('el index del datáfono expone invoicingEnabled al modal de mostrador', function () {
    $admin = \App\Models\User::factory()->create(['role' => 'admin']);

    config(['invoicing.enabled' => true]);
    $this->actingAs($admin)
        ->get(route('admin.payments.datafono.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('invoicingEnabled', true));

    config(['invoicing.enabled' => false]);
    $this->actingAs($admin)
        ->get(route('admin.payments.datafono.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('invoicingEnabled', false));
});
