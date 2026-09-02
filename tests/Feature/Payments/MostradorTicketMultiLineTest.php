<?php

declare(strict_types=1);

use App\DTOs\Payments\MostradorTicketLineDto;
use App\Models\DatafonoPayment;
use App\Models\MostradorTicket;
use App\Models\MostradorTicketLine;
use App\Models\PaymentTerminal;
use App\Models\Pedido;
use App\Models\PhotoSession;
use App\Models\PhotoSessionBooking;
use App\Models\Producto;
use App\Models\User;
use App\Services\Payments\DatafonoPaymentReconciliationService;
use App\Services\Payments\MostradorTicketService;
use App\Support\BusinessDateTime;
use App\Support\MoneyCents;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->terminal = PaymentTerminal::query()->create([
        'codigo' => 'ticket_tpv_'.uniqid(),
        'nombre' => 'TPV ticket test',
        'activo' => true,
        'emite_ticketbai_propio' => true,
    ]);
    $this->tickets = app(MostradorTicketService::class);
    $this->reconciliation = app(DatafonoPaymentReconciliationService::class);
});

test('efectivo producto+fotos guest crea 1 cobro y 2 líneas', function () {
    $producto = Producto::factory()->create([
        'nombre' => 'Gorra ticket',
        'precio' => 30,
        'descuento' => 0,
        'unidades' => 5,
        'eliminado' => false,
    ]);
    $session = PhotoSession::query()->create([
        'nombre' => 'Sesión ticket',
        'descripcion' => null,
        'precio_cents' => 5000,
        'plus_por_persona_cents' => 0,
        'duracion_minutos' => 60,
        'activo' => true,
    ]);

    $admin = User::factory()->create(['role' => 'admin']);
    $productCents = MoneyCents::eurosToCents(30.0);
    $photoCents = 5000;
    $fecha = BusinessDateTime::now()->addDay()->format('Y-m-d H:i:s');

    $payment = $this->tickets->closeCashTicket(
        null,
        'Ana García',
        'ana@example.test',
        [
            MostradorTicketLineDto::fromArray([
                'category' => 'producto',
                'amount_cents' => $productCents,
                'product_ids' => [$producto->id],
            ]),
            MostradorTicketLineDto::fromArray([
                'category' => 'fotos',
                'amount_cents' => $photoCents,
                'photo_session_id' => $session->id,
                'fecha_inicio' => $fecha,
                'party_size' => 1,
            ]),
        ],
        [
            'payment_terminal_id' => $this->terminal->id,
            'paid_at' => now()->toIso8601String(),
            'created_by' => $admin->id,
            'reviewed_by' => $admin->id,
        ],
    );

    expect($payment->status)->toBe(DatafonoPayment::STATUS_ASSIGNED)
        ->and((int) $payment->amount_cents)->toBe($productCents + $photoCents);

    $ticket = MostradorTicket::query()->where('datafono_payment_id', $payment->id)->first();
    expect($ticket)->not->toBeNull()
        ->and($ticket->guest_name)->toBe('Ana García')
        ->and(MostradorTicketLine::query()->where('ticket_id', $ticket->id)->count())->toBe(2);

    expect(Pedido::query()->count())->toBe(1)
        ->and(PhotoSessionBooking::query()->count())->toBe(1);

    $listed = collect($this->reconciliation->listPayments())
        ->firstWhere('id', $payment->id);
    expect($listed['domains'])->toContain('producto')
        ->and($listed['domains'])->toContain('fotos');
});

test('TPV assign con suma de líneas distinta falla', function () {
    $payment = $this->reconciliation->registerRawPayment([
        'payment_terminal_id' => $this->terminal->id,
        'amount_cents' => 20000,
        'paid_at' => now(),
        'external_reference' => 'TPV-MULTI-'.uniqid(),
        'source' => DatafonoPayment::SOURCE_TPV,
    ]);

    $producto = Producto::factory()->create([
        'precio' => 30,
        'descuento' => 0,
        'unidades' => 3,
        'eliminado' => false,
    ]);

    expect(fn () => $this->tickets->assignTpvTicket(
        $payment,
        null,
        'Cliente',
        null,
        [
            MostradorTicketLineDto::fromArray([
                'category' => 'producto',
                'amount_cents' => MoneyCents::eurosToCents(30.0),
                'product_ids' => [$producto->id],
            ]),
        ],
    ))->toThrow(ValidationException::class);
});

test('TPV assign con suma exacta cierra el cobro', function () {
    $producto = Producto::factory()->create([
        'precio' => 30.00,
        'descuento' => 0,
        'unidades' => 3,
        'eliminado' => false,
    ]);
    $producto->refresh();
    $cents = MoneyCents::eurosToCents((float) $producto->precio);
    $payment = $this->reconciliation->registerRawPayment([
        'payment_terminal_id' => $this->terminal->id,
        'amount_cents' => $cents,
        'paid_at' => now(),
        'external_reference' => 'TPV-OK-'.uniqid(),
        'source' => DatafonoPayment::SOURCE_TPV,
    ]);

    $result = $this->tickets->assignTpvTicket(
        $payment,
        null,
        'Cliente Mostrador',
        null,
        [
            MostradorTicketLineDto::fromArray([
                'category' => 'producto',
                'amount_cents' => $cents,
                'product_ids' => [$producto->id],
            ]),
        ],
    );

    expect($result->status)->toBe(DatafonoPayment::STATUS_ASSIGNED)
        ->and($result->ticket)->not->toBeNull();
});

test('línea bono con guest falla', function () {
    $admin = User::factory()->create(['role' => 'admin']);

    expect(fn () => $this->tickets->closeCashTicket(
        null,
        'Guest',
        null,
        [
            MostradorTicketLineDto::fromArray([
                'category' => 'bono',
                'amount_cents' => 5000,
                'pack_bono_id' => 1,
            ]),
        ],
        [
            'payment_terminal_id' => $this->terminal->id,
            'paid_at' => now()->toIso8601String(),
            'created_by' => $admin->id,
        ],
    ))->toThrow(ValidationException::class);
});

test('línea taquilla sin locker falla', function () {
    $user = User::factory()->create([
        'role' => 'user',
        'is_vip' => true,
        'numeroTaquilla' => null,
    ]);
    $admin = User::factory()->create(['role' => 'admin']);

    expect(fn () => $this->tickets->closeCashTicket(
        $user,
        null,
        null,
        [
            MostradorTicketLineDto::fromArray([
                'category' => 'taquilla',
                'amount_cents' => 5000,
                'plan_taquilla_id' => 1,
            ]),
        ],
        [
            'payment_terminal_id' => $this->terminal->id,
            'paid_at' => now()->toIso8601String(),
            'created_by' => $admin->id,
        ],
    ))->toThrow(ValidationException::class);
});

test('cash guest sin email se cierra si la facturación está apagada', function () {
    config(['invoicing.enabled' => false]);

    $producto = Producto::factory()->create([
        'precio' => 12,
        'descuento' => 0,
        'unidades' => 3,
        'eliminado' => false,
    ]);
    $admin = User::factory()->create(['role' => 'admin']);

    $payment = $this->tickets->closeCashTicket(
        null,
        'Ana García',
        null,
        [
            MostradorTicketLineDto::fromArray([
                'category' => 'producto',
                'amount_cents' => MoneyCents::eurosToCents(12.0),
                'product_ids' => [$producto->id],
            ]),
        ],
        [
            'payment_terminal_id' => $this->terminal->id,
            'paid_at' => now()->toIso8601String(),
            'created_by' => $admin->id,
            'reviewed_by' => $admin->id,
        ],
    );

    expect($payment->status)->toBe(DatafonoPayment::STATUS_ASSIGNED);
    $pedido = Pedido::query()->findOrFail($payment->payable_id);
    expect($pedido->guest_name)->toBe('Ana García')
        ->and($pedido->guest_email)->toBeNull();
});

test('cash guest sin email no se cierra si TicketBAI está activo', function () {
    config(['invoicing.enabled' => true]);

    $producto = Producto::factory()->create([
        'precio' => 12,
        'descuento' => 0,
        'unidades' => 3,
        'eliminado' => false,
    ]);
    $admin = User::factory()->create(['role' => 'admin']);

    expect(fn () => $this->tickets->closeCashTicket(
        null,
        'Ana García',
        null,
        [
            MostradorTicketLineDto::fromArray([
                'category' => 'producto',
                'amount_cents' => MoneyCents::eurosToCents(12.0),
                'product_ids' => [$producto->id],
            ]),
        ],
        [
            'payment_terminal_id' => $this->terminal->id,
            'paid_at' => now()->toIso8601String(),
            'created_by' => $admin->id,
            'reviewed_by' => $admin->id,
        ],
    ))->toThrow(ValidationException::class);

    expect(Pedido::query()->count())->toBe(0)
        ->and($producto->fresh()->unidades)->toBe(3);
});
