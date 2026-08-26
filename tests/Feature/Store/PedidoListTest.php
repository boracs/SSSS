<?php

declare(strict_types=1);

use App\Enums\FiscalInvoiceStatus;
use App\Models\FiscalInvoice;
use App\Models\Pedido;
use App\Models\Producto;
use App\Models\User;

test('mis pedidos lista un pedido pagado con productos sin TypeError', function () {
    $user = User::factory()->create();
    $producto = Producto::factory()->create(['eliminado' => false, 'unidades' => 5]);
    $pedido = Pedido::factory()->create([
        'user_id' => $user->id,
        'pagado' => true,
        'precio_total_cents' => 1000,
        'payment_method' => 'card',
    ]);
    $pedido->productos()->attach($producto->id, [
        'cantidad' => 1,
        'descuento_aplicado' => 0,
        'precio_pagado_cents' => 1000,
    ]);

    $this->actingAs($user)
        ->get(route('pedidos'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Pedidos')
            ->has('pedidos', 1)
            ->where('pedidos.0.id', $pedido->id)
            ->where('pedidos.0.productos.0.id', $producto->id));
});

test('mis pedidos enlaza la factura aunque esté en trámite', function () {
    $user = User::factory()->create();
    $pedido = Pedido::factory()->create([
        'user_id' => $user->id,
        'pagado' => true,
        'precio_total_cents' => 3261,
        'payment_method' => 'card',
    ]);
    $invoice = FiscalInvoice::query()->create([
        'payable_type' => Pedido::class,
        'payable_id' => $pedido->id,
        'stripe_checkout_session_id' => 'cs_test_pedido_list_pending',
        'amount_cents' => 3261,
        'status' => FiscalInvoiceStatus::Processing,
        'b2b_invoice_id' => 'inv_pending_1',
    ]);

    $this->actingAs($user)
        ->get(route('pedidos'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Pedidos')
            ->where('pedidos.0.fiscal_invoice_ready', false)
            ->where(
                'pedidos.0.fiscal_invoice_url',
                route('payments.fiscal-invoices.show', $invoice),
            )
            ->where(
                'pedidos.0.fiscal_invoice_pdf_url',
                route('payments.fiscal-invoices.pdf', $invoice),
            ));
});

test('mis pedidos no lista pedidos no pagados (checkout Stripe abandonado)', function () {
    $user = User::factory()->create();
    $producto = Producto::factory()->create(['eliminado' => false, 'unidades' => 5]);

    Pedido::factory()->create([
        'user_id' => $user->id,
        'pagado' => false,
        'precio_total_cents' => 1000,
        'payment_method' => 'card',
    ])->productos()->attach($producto->id, [
        'cantidad' => 1,
        'descuento_aplicado' => 0,
        'precio_pagado_cents' => 1000,
    ]);

    $pagado = Pedido::factory()->create([
        'user_id' => $user->id,
        'pagado' => true,
        'precio_total_cents' => 2000,
        'payment_method' => 'card',
    ]);
    $pagado->productos()->attach($producto->id, [
        'cantidad' => 1,
        'descuento_aplicado' => 0,
        'precio_pagado_cents' => 2000,
    ]);

    $this->actingAs($user)
        ->get(route('pedidos'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Pedidos')
            ->has('pedidos', 1)
            ->where('pedidos.0.id', $pagado->id));
});
