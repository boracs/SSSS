<?php

declare(strict_types=1);

use App\Models\DatafonoPayment;
use App\Models\PaymentTerminal;
use App\Models\Pedido;
use App\Models\PhotoSession;
use App\Models\PhotoSessionBooking;
use App\Models\Producto;
use App\Services\Payments\DatafonoPaymentReconciliationService;
use App\Support\BusinessDateTime;
use App\Support\MoneyCents;
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
