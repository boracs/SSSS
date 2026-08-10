<?php

declare(strict_types=1);

use App\Models\Booking;
use App\Models\DatafonoPayment;
use App\Models\PaymentTerminal;
use App\Models\Surfboard;
use App\Models\User;
use App\Services\Payments\DatafonoPaymentReconciliationService;
use App\Support\BusinessDateTime;
use App\Support\MoneyCents;
use Illuminate\Validation\ValidationException;

beforeEach(function () {
    config([
        'services.academy.business_timezone' => 'Europe/Madrid',
        'rentals.turnover_buffer_minutes' => 30,
        'rentals.pickup_window_start' => '09:00',
        'rentals.pickup_window_end' => '19:00',
        'rentals.pricing_step_minutes' => 30,
        'rentals.deposit_percentage' => 30,
    ]);

    $this->terminal = PaymentTerminal::query()->first()
        ?? PaymentTerminal::query()->create([
            'codigo' => 'test_tpv',
            'nombre' => 'TPV test',
            'activo' => true,
            'emite_ticketbai_propio' => true,
        ]);

    $this->service = app(DatafonoPaymentReconciliationService::class);
});

function makePendingDatafonoPayment(PaymentTerminal $terminal, int $amountCents): DatafonoPayment
{
    return DatafonoPayment::query()->create([
        'payment_terminal_id' => $terminal->id,
        'amount_cents' => $amountCents,
        'paid_at' => BusinessDateTime::now(),
        'status' => DatafonoPayment::STATUS_PENDING_REVIEW,
    ]);
}

test('conciliar booking con payment_method datafono no revienta (ENUM OK)', function () {
    $user = User::factory()->create(['role' => 'user']);
    $booking = Booking::factory()->create([
        'user_id' => $user->id,
        'total_price' => 25.50,
        'status' => Booking::STATUS_PENDING,
        'payment_status' => Booking::PAYMENT_PENDING,
    ]);
    $amountCents = MoneyCents::eurosToCents(25.50);
    $payment = makePendingDatafonoPayment($this->terminal, $amountCents);

    $result = $this->service->reconcile($payment, $user, [
        'category' => 'alquiler',
        'payable_id' => $booking->id,
        'reviewed_by' => $user->id,
    ]);

    expect($result->status)->toBe(DatafonoPayment::STATUS_ASSIGNED)
        ->and($result->payable_type)->toBe(Booking::class)
        ->and($result->payable_id)->toBe($booking->id)
        ->and($result->assigned_user_id)->toBe($user->id);

    $booking->refresh();
    expect($booking->payment_status)->toBe(Booking::PAYMENT_CONFIRMED)
        ->and($booking->payment_method)->toBe('datafono');
});

test('mismatch de importes lanza ValidationException', function () {
    $user = User::factory()->create(['role' => 'user']);
    $booking = Booking::factory()->create([
        'user_id' => $user->id,
        'total_price' => 40,
        'status' => Booking::STATUS_PENDING,
        'payment_status' => Booking::PAYMENT_PENDING,
    ]);
    $payment = makePendingDatafonoPayment($this->terminal, 500); // 5 € ≠ 40 €

    expect(fn () => $this->service->reconcile($payment, $user, [
        'category' => 'alquiler',
        'payable_id' => $booking->id,
    ]))->toThrow(ValidationException::class);

    $payment->refresh();
    $booking->refresh();
    expect($payment->status)->toBe(DatafonoPayment::STATUS_PENDING_REVIEW)
        ->and($booking->payment_status)->toBe(Booking::PAYMENT_PENDING);
});

test('payable ya confirmado se rechaza', function () {
    $user = User::factory()->create(['role' => 'user']);
    $booking = Booking::factory()->fullyPaid()->create([
        'user_id' => $user->id,
        'total_price' => 30,
    ]);
    $payment = makePendingDatafonoPayment($this->terminal, MoneyCents::eurosToCents(30));

    expect(fn () => $this->service->reconcile($payment, $user, [
        'category' => 'alquiler',
        'payable_id' => $booking->id,
    ]))->toThrow(ValidationException::class);

    expect($payment->fresh()->status)->toBe(DatafonoPayment::STATUS_PENDING_REVIEW);
});

test('payable ya asignado a otro cobro datáfono se rechaza', function () {
    $user = User::factory()->create(['role' => 'user']);
    $booking = Booking::factory()->create([
        'user_id' => $user->id,
        'total_price' => 18,
        'status' => Booking::STATUS_PENDING,
        'payment_status' => Booking::PAYMENT_PENDING,
    ]);
    $amountCents = MoneyCents::eurosToCents(18);

    $first = makePendingDatafonoPayment($this->terminal, $amountCents);
    $this->service->reconcile($first, $user, [
        'category' => 'alquiler',
        'payable_id' => $booking->id,
    ]);

    // Simula un segundo cobro intentando enlazar el mismo payable (ya confirmado también).
    // Para aislar anti-doble vínculo: recreamos un booking pendiente "clon" no — el prompt
    // pide payable ya enlazado. Tras el primer reconcile el booking está confirmed;
    // forzamos pending artificialmente para llegar al check de vínculo.
    $booking->update([
        'payment_status' => Booking::PAYMENT_PENDING,
        'status' => Booking::STATUS_PENDING,
    ]);

    $second = makePendingDatafonoPayment($this->terminal, $amountCents);

    expect(fn () => $this->service->reconcile($second, $user, [
        'category' => 'alquiler',
        'payable_id' => $booking->id,
    ]))->toThrow(ValidationException::class);

    expect($second->fresh()->status)->toBe(DatafonoPayment::STATUS_PENDING_REVIEW);
});

// ── Resto pendiente (depósito ya confirmado online) ────────────

test('conciliar el resto de un alquiler con depósito confirmado lo marca cobrado', function () {
    $user = User::factory()->create(['role' => 'user']);
    $booking = Booking::factory()->create([
        'user_id' => $user->id,
        'total_price' => 16,
        'deposit_amount' => 4.8,
        'status' => Booking::STATUS_CONFIRMED,
        'payment_status' => Booking::PAYMENT_CONFIRMED,
        'balance_status' => Booking::BALANCE_PENDING,
    ]);
    $remainingCents = MoneyCents::eurosToCents(16 - 4.8);
    $payment = makePendingDatafonoPayment($this->terminal, $remainingCents);

    $this->service->reconcile($payment, $user, [
        'category' => 'alquiler',
        'payable_id' => $booking->id,
        'reviewed_by' => $user->id,
    ]);

    $booking->refresh();
    expect($booking->balance_status)->toBe(Booking::BALANCE_CONFIRMED)
        // Cobro en efectivo (helper de test no fija source=tpv → default manual_cash).
        ->and($booking->balance_payment_method)->toBe('efectivo')
        ->and($booking->balance_paid_at)->not->toBeNull()
        // El depósito no se toca: ya estaba confirmed antes de cobrar el resto.
        ->and($booking->payment_status)->toBe(Booking::PAYMENT_CONFIRMED)
        ->and((float) $booking->deposit_amount)->toBe(4.8);
});

test('el resto exige el importe restante, no el total, y avisa si no coincide', function () {
    $user = User::factory()->create(['role' => 'user']);
    $booking = Booking::factory()->create([
        'user_id' => $user->id,
        'total_price' => 16,
        'deposit_amount' => 4.8,
        'status' => Booking::STATUS_CONFIRMED,
        'payment_status' => Booking::PAYMENT_CONFIRMED,
        'balance_status' => Booking::BALANCE_PENDING,
    ]);
    // Paga el total (16 €) en vez del resto (11,20 €): no coincide.
    $payment = makePendingDatafonoPayment($this->terminal, MoneyCents::eurosToCents(16));

    expect(fn () => $this->service->reconcile($payment, $user, [
        'category' => 'alquiler',
        'payable_id' => $booking->id,
    ]))->toThrow(ValidationException::class);

    expect($booking->fresh()->balance_status)->toBe(Booking::BALANCE_PENDING);
});

test('pendingCandidatesForUser incluye el resto pendiente etiquetado', function () {
    $user = User::factory()->create(['role' => 'user']);
    $board = Surfboard::factory()->create(['name' => 'Tabla resto']);
    Booking::factory()->for($board)->create([
        'user_id' => $user->id,
        'total_price' => 16,
        'deposit_amount' => 4.8,
        'status' => Booking::STATUS_CONFIRMED,
        'payment_status' => Booking::PAYMENT_CONFIRMED,
        'balance_status' => Booking::BALANCE_PENDING,
    ]);

    $candidates = $this->service->pendingCandidatesForUser($user, 'alquiler');

    expect($candidates)->toHaveCount(1);
    expect($candidates[0]['label'])->toContain('Resto');
    expect($candidates[0]['amount_cents'])->toBe(MoneyCents::eurosToCents(16 - 4.8));
});

test('chargeBookingBalanceCash cobra el resto en efectivo y deja rastro en el ledger', function () {
    $user = User::factory()->create(['role' => 'user']);
    $booking = Booking::factory()->create([
        'user_id' => $user->id,
        'total_price' => 16,
        'deposit_amount' => 4.8,
        'status' => Booking::STATUS_CONFIRMED,
        'payment_status' => Booking::PAYMENT_CONFIRMED,
        'balance_status' => Booking::BALANCE_PENDING,
    ]);

    $result = $this->service->chargeBookingBalanceCash($booking);

    expect($result->balance_status)->toBe(Booking::BALANCE_CONFIRMED)
        ->and($result->balance_payment_method)->toBe('efectivo');

    $ledgerEntry = DatafonoPayment::query()
        ->where('payable_type', Booking::class)
        ->where('payable_id', $booking->id)
        ->where('source', DatafonoPayment::SOURCE_MANUAL_CASH)
        ->first();

    expect($ledgerEntry)->not->toBeNull()
        ->and((int) $ledgerEntry->amount_cents)->toBe(MoneyCents::eurosToCents(16 - 4.8));
});

// ── Walk-in: alquiler nuevo creado desde el datáfono ────────────

test('crear un alquiler walk-in desde datáfono cobra el 100% y no deja resto', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $board = Surfboard::factory()->create(); // price_120m del esquema por defecto = 16 €
    $payment = makePendingDatafonoPayment($this->terminal, MoneyCents::eurosToCents(16));

    $result = $this->service->reconcile($payment, null, [
        'category' => 'alquiler',
        'surfboard_id' => $board->id,
        'guest_name' => 'Cliente Mostrador',
        'rental_mode' => 'hour',
        'rental_pack_minutes' => 120,
        'rental_pickup_at' => '2026-08-20T10:00',
        'reviewed_by' => $admin->id,
    ]);

    expect($result->status)->toBe(DatafonoPayment::STATUS_ASSIGNED)
        ->and($result->payable_type)->toBe(Booking::class);

    $booking = Booking::query()->findOrFail($result->payable_id);
    expect($booking->status)->toBe(Booking::STATUS_CONFIRMED)
        ->and($booking->payment_status)->toBe(Booking::PAYMENT_CONFIRMED)
        ->and($booking->balance_status)->toBe(Booking::BALANCE_NONE)
        ->and((float) $booking->total_price)->toBe(16.0)
        ->and((float) $booking->deposit_amount)->toBe(16.0)
        ->and($booking->client_name)->toBe('Cliente Mostrador')
        ->and($booking->surfboard_id)->toBe($board->id);
});

test('el walk-in de alquiler sin tabla ni cliente lanza validación clara', function () {
    $payment = makePendingDatafonoPayment($this->terminal, 1000);

    expect(fn () => $this->service->reconcile($payment, null, [
        'category' => 'alquiler',
        'guest_name' => 'Sin tabla',
    ]))->toThrow(ValidationException::class);
});

test('el walk-in de alquiler no se crea si la tabla no está disponible en ese rango', function () {
    $board = Surfboard::factory()->create();
    Booking::factory()->for($board)->hourWindow(BusinessDateTime::parseInAppTimezone('2026-08-20 10:00:00'), 120)->create();

    $payment = makePendingDatafonoPayment($this->terminal, MoneyCents::eurosToCents(16));

    expect(fn () => $this->service->reconcile($payment, null, [
        'category' => 'alquiler',
        'surfboard_id' => $board->id,
        'guest_name' => 'Cliente Mostrador',
        'rental_mode' => 'hour',
        'rental_pack_minutes' => 120,
        'rental_pickup_at' => '2026-08-20T10:00',
    ]))->toThrow(ValidationException::class);

    expect(Booking::query()->count())->toBe(1);
});
