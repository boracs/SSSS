<?php

declare(strict_types=1);

use App\Events\Payments\PaymentConfirmed;
use App\Models\DatafonoPayment;
use App\Models\PaymentTerminal;
use App\Models\Producto;
use App\Models\User;
use App\Services\Payments\DatafonoPaymentReconciliationService;
use App\Support\BusinessDateTime;
use App\Support\MoneyCents;
use Illuminate\Support\Facades\Event;
use Illuminate\Validation\ValidationException;

beforeEach(function () {
    $this->service = app(DatafonoPaymentReconciliationService::class);
});

function datafonoTerminal(bool $emiteTicketBai = true): PaymentTerminal
{
    return PaymentTerminal::query()->create([
        'codigo' => 'tpv_'.uniqid(),
        'nombre' => 'TPV test',
        'activo' => true,
        'emite_ticketbai_propio' => $emiteTicketBai,
    ]);
}

function pendingCobro(PaymentTerminal $terminal, int $amountCents, string $source = DatafonoPayment::SOURCE_MANUAL_CASH): DatafonoPayment
{
    return DatafonoPayment::query()->create([
        'payment_terminal_id' => $terminal->id,
        'amount_cents' => $amountCents,
        'paid_at' => BusinessDateTime::now(),
        'status' => DatafonoPayment::STATUS_PENDING_REVIEW,
        'source' => $source,
    ]);
}

test('reconcile producto descuenta una unidad de stock y usa precio de catalogo', function () {
    $user = User::factory()->create(['role' => 'user']);
    $producto = Producto::factory()->create([
        'nombre' => 'Parafina',
        'precio' => 10.00,
        'descuento' => 0,
        'unidades' => 5,
        'eliminado' => false,
    ]);
    $terminal = datafonoTerminal(true);
    $amountCents = MoneyCents::eurosToCents(10.00);
    $payment = pendingCobro($terminal, $amountCents);

    $result = $this->service->reconcile($payment, $user, [
        'category' => 'producto',
        'product_ids' => [$producto->id],
    ]);

    expect($result->status)->toBe(DatafonoPayment::STATUS_ASSIGNED)
        ->and($result->payable_type)->toBe(\App\Models\Pedido::class);

    $producto->refresh();
    expect($producto->unidades)->toBe(4);

    $pedido = \App\Models\Pedido::query()->findOrFail($result->payable_id);
    expect((float) $pedido->precio_total)->toBe(10.0)
        ->and((bool) $pedido->pagado)->toBeTrue();

    $line = $pedido->productos()->first();
    expect((int) $line->pivot->precio_pagado_cents)->toBe(1000);
});

test('un producto rebajado se cobra al precio con descuento sin 422', function () {
    $user = User::factory()->create(['role' => 'user']);
    $producto = Producto::factory()->create([
        'nombre' => 'Neopreno rebajado',
        'precio' => 100.00,
        'descuento' => 10,
        'unidades' => 3,
        'eliminado' => false,
    ]);
    $terminal = datafonoTerminal(true);
    // Importe que manda el mostrador con el catálogo ya corregido: 90 €, no 100.
    $payment = pendingCobro($terminal, 9000);

    $result = $this->service->reconcile($payment, $user, [
        'category' => 'producto',
        'product_ids' => [$producto->id],
    ]);

    expect($result->status)->toBe(DatafonoPayment::STATUS_ASSIGNED);

    $pedido = \App\Models\Pedido::query()->findOrFail($result->payable_id);
    expect((int) $pedido->precio_total_cents)->toBe(9000)
        ->and((int) $pedido->productos()->first()->pivot->precio_pagado_cents)->toBe(9000)
        ->and((int) $producto->fresh()->unidades)->toBe(2);
});

test('cobrar un producto rebajado al PVP base sigue dando 422', function () {
    $user = User::factory()->create(['role' => 'user']);
    $producto = Producto::factory()->create([
        'precio' => 100.00,
        'descuento' => 10,
        'unidades' => 3,
        'eliminado' => false,
    ]);
    $terminal = datafonoTerminal(true);
    $payment = pendingCobro($terminal, 10000);

    expect(fn () => $this->service->reconcile($payment, $user, [
        'category' => 'producto',
        'product_ids' => [$producto->id],
    ]))->toThrow(ValidationException::class);

    expect($producto->fresh()->unidades)->toBe(3);
});

test('stock insuficiente lanza ValidationException y no asigna el cobro', function () {
    $user = User::factory()->create(['role' => 'user']);
    $producto = Producto::factory()->create([
        'precio' => 12.00,
        'descuento' => 0,
        'unidades' => 0,
        'eliminado' => false,
    ]);
    $terminal = datafonoTerminal(true);
    $payment = pendingCobro($terminal, MoneyCents::eurosToCents(12.00));

    expect(fn () => $this->service->reconcile($payment, $user, [
        'category' => 'producto',
        'product_ids' => [$producto->id],
    ]))->toThrow(ValidationException::class);

    expect($payment->fresh()->status)->toBe(DatafonoPayment::STATUS_PENDING_REVIEW)
        ->and($producto->fresh()->unidades)->toBe(0);
});

test('terminal sin TicketBAI propio dispara PaymentConfirmed tras conciliar', function () {
    Event::fake([PaymentConfirmed::class]);

    $user = User::factory()->create(['role' => 'user']);
    $producto = Producto::factory()->create([
        'precio' => 8.50,
        'descuento' => 0,
        'unidades' => 3,
        'eliminado' => false,
    ]);
    $terminal = datafonoTerminal(false);
    $amountCents = MoneyCents::eurosToCents(8.50);
    $payment = pendingCobro($terminal, $amountCents);

    $result = $this->service->reconcile($payment, $user, [
        'category' => 'producto',
        'product_ids' => [$producto->id],
    ]);

    Event::assertDispatched(PaymentConfirmed::class, function (PaymentConfirmed $event) use ($result, $amountCents) {
        return $event->payableType === \App\Models\Pedido::class
            && $event->payableId === (int) $result->payable_id
            && $event->amountCents === $amountCents
            && str_starts_with($event->stripeSessionId, 'datafono-'.$result->id);
    });
});

test('terminal con TicketBAI propio no dispara PaymentConfirmed en cobro TPV', function () {
    Event::fake([PaymentConfirmed::class]);

    $user = User::factory()->create(['role' => 'user']);
    $producto = Producto::factory()->create([
        'precio' => 7.00,
        'descuento' => 0,
        'unidades' => 2,
        'eliminado' => false,
    ]);
    $terminal = datafonoTerminal(true);
    $payment = pendingCobro($terminal, MoneyCents::eurosToCents(7.00), DatafonoPayment::SOURCE_TPV);

    $this->service->reconcile($payment, $user, [
        'category' => 'producto',
        'product_ids' => [$producto->id],
    ]);

    Event::assertNotDispatched(PaymentConfirmed::class);
});

test('efectivo dispara PaymentConfirmed aunque el terminal tenga TicketBAI propio', function () {
    Event::fake([PaymentConfirmed::class]);

    $user = User::factory()->create(['role' => 'user']);
    $producto = Producto::factory()->create([
        'precio' => 7.00,
        'descuento' => 0,
        'unidades' => 2,
        'eliminado' => false,
    ]);
    $terminal = datafonoTerminal(true);
    $payment = pendingCobro($terminal, MoneyCents::eurosToCents(7.00), DatafonoPayment::SOURCE_MANUAL_CASH);

    $result = $this->service->reconcile($payment, $user, [
        'category' => 'producto',
        'product_ids' => [$producto->id],
    ]);

    Event::assertDispatched(PaymentConfirmed::class, function (PaymentConfirmed $event) use ($result) {
        return $event->payableType === \App\Models\Pedido::class
            && $event->payableId === (int) $result->payable_id
            && str_starts_with($event->stripeSessionId, 'datafono-'.$result->id);
    });
});

test('communicateToHacienda encola B2B en cobro efectivo asignado', function () {
    Event::fake([PaymentConfirmed::class]);

    $user = User::factory()->create(['role' => 'user']);
    $producto = Producto::factory()->create([
        'precio' => 9.00,
        'descuento' => 0,
        'unidades' => 2,
        'eliminado' => false,
    ]);
    $terminal = datafonoTerminal(true);
    $payment = pendingCobro($terminal, MoneyCents::eurosToCents(9.00), DatafonoPayment::SOURCE_MANUAL_CASH);

    $assigned = $this->service->reconcile($payment, $user, [
        'category' => 'producto',
        'product_ids' => [$producto->id],
    ]);

    Event::fake([PaymentConfirmed::class]);

    $this->service->communicateToHacienda($assigned->fresh(['terminal', 'ticket.lines']));

    Event::assertDispatched(PaymentConfirmed::class);
});

test('listPayments incluye estado Hacienda pendiente en efectivo sin factura', function () {
    $user = User::factory()->create(['role' => 'user']);
    $producto = Producto::factory()->create([
        'precio' => 6.00,
        'descuento' => 0,
        'unidades' => 2,
        'eliminado' => false,
    ]);
    $terminal = datafonoTerminal(true);
    $payment = pendingCobro($terminal, MoneyCents::eurosToCents(6.00), DatafonoPayment::SOURCE_MANUAL_CASH);

    Event::fake([PaymentConfirmed::class]);
    $this->service->reconcile($payment, $user, [
        'category' => 'producto',
        'product_ids' => [$producto->id],
    ]);

    $row = collect($this->service->listPayments())->firstWhere('id', $payment->id);

    expect($row)->not->toBeNull()
        ->and($row['hacienda']['code'])->toBe('pending')
        ->and($row['hacienda']['can_communicate'])->toBeTrue();
});
