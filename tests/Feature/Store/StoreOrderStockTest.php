<?php

declare(strict_types=1);

use App\Models\Pedido;
use App\Models\Producto;
use App\Models\User;
use App\Services\Store\StoreOrderStockService;

test('reservar pedido bloquea stock y lo resta al producto', function () {
    $user = User::factory()->create();
    $producto = Producto::factory()->create([
        'unidades' => 5,
        'precio' => 10,
        'descuento' => 0,
        'eliminado' => false,
    ]);

    $pedido = app(StoreOrderStockService::class)->reserveFromCartLines(
        $user,
        [['id' => $producto->id, 'cantidad' => 2]],
    );

    expect($pedido->pagado)->toBeFalsy()
        ->and((int) $producto->fresh()->unidades)->toBe(3)
        ->and($pedido->productos)->toHaveCount(1);
});

test('no permite reservar más unidades de las que hay', function () {
    $user = User::factory()->create();
    $producto = Producto::factory()->create([
        'unidades' => 1,
        'eliminado' => false,
    ]);

    app(StoreOrderStockService::class)->reserveFromCartLines(
        $user,
        [['id' => $producto->id, 'cantidad' => 2]],
    );
})->throws(InvalidArgumentException::class);

test('liberar pedido no pagado restaura stock y borra el pedido', function () {
    $user = User::factory()->create();
    $producto = Producto::factory()->create([
        'unidades' => 4,
        'precio' => 8,
        'descuento' => 0,
        'eliminado' => false,
    ]);
    $stock = app(StoreOrderStockService::class);
    $pedido = $stock->reserveFromCartLines($user, [['id' => $producto->id, 'cantidad' => 3]]);

    expect($stock->releaseUnpaid($pedido))->toBeTrue()
        ->and((int) $producto->fresh()->unidades)->toBe(4)
        ->and(Pedido::query()->whereKey($pedido->id)->exists())->toBeFalse();
});

test('no libera un pedido ya pagado', function () {
    $user = User::factory()->create();
    $producto = Producto::factory()->create([
        'unidades' => 2,
        'eliminado' => false,
    ]);
    $stock = app(StoreOrderStockService::class);
    $pedido = $stock->reserveFromCartLines($user, [['id' => $producto->id, 'cantidad' => 1]]);
    $pedido->update(['pagado' => true]);

    expect($stock->releaseUnpaid($pedido->fresh()))->toBeFalse()
        ->and((int) $producto->fresh()->unidades)->toBe(1)
        ->and(Pedido::query()->whereKey($pedido->id)->exists())->toBeTrue();
});

test('el total del pedido se guarda desde céntimos y rechaza un total cotizado distinto', function () {
    $user = User::factory()->create();
    $producto = Producto::factory()->create([
        'unidades' => 5,
        'precio' => 19.99,
        'descuento' => 10,
        'eliminado' => false,
    ]);
    $stock = app(StoreOrderStockService::class);

    $pedido = $stock->reserveFromCartLines(
        $user,
        [['id' => $producto->id, 'cantidad' => 2]],
        null,
        35.98,
    );

    expect((float) $pedido->precio_total)->toBe(35.98)
        ->and((int) $pedido->productos->first()->pivot->precio_pagado_cents)->toBe(1799);

    $stock->reserveFromCartLines(
        $user,
        [['id' => $producto->id, 'cantidad' => 1]],
        null,
        1.00,
    );
})->throws(InvalidArgumentException::class);

test('el cron libera solo pedidos no pagados más viejos que el margen', function () {
    config(['store.unpaid_hold_minutes' => 30]);

    $user = User::factory()->create();
    $viejo = Producto::factory()->create(['unidades' => 5, 'eliminado' => false, 'descuento' => 0, 'precio' => 10]);
    $nuevo = Producto::factory()->create(['unidades' => 5, 'eliminado' => false, 'descuento' => 0, 'precio' => 10]);
    $stock = app(StoreOrderStockService::class);

    $pedidoViejo = $stock->reserveFromCartLines($user, [['id' => $viejo->id, 'cantidad' => 1]]);
    $pedidoNuevo = $stock->reserveFromCartLines($user, [['id' => $nuevo->id, 'cantidad' => 1]]);

    Pedido::query()->whereKey($pedidoViejo->id)->update(['created_at' => now()->subHours(2)]);

    expect($stock->releaseExpiredUnpaid())->toBe(1)
        ->and((int) $viejo->fresh()->unidades)->toBe(5)
        ->and((int) $nuevo->fresh()->unidades)->toBe(4)
        ->and(Pedido::query()->whereKey($pedidoNuevo->id)->exists())->toBeTrue();
});

test('el cron no libera pedidos sin card, entregados o de otro método', function () {
    config(['store.unpaid_hold_minutes' => 30]);

    $user = User::factory()->create();
    $stock = app(StoreOrderStockService::class);

    $sinMetodo = Producto::factory()->create(['unidades' => 3, 'eliminado' => false, 'descuento' => 0, 'precio' => 10]);
    $entregado = Producto::factory()->create(['unidades' => 3, 'eliminado' => false, 'descuento' => 0, 'precio' => 10]);
    $datafono = Producto::factory()->create(['unidades' => 3, 'eliminado' => false, 'descuento' => 0, 'precio' => 10]);

    $pNull = $stock->reserveFromCartLines($user, [['id' => $sinMetodo->id, 'cantidad' => 1]]);
    $pEntregado = $stock->reserveFromCartLines($user, [['id' => $entregado->id, 'cantidad' => 1]]);
    $pDatafono = $stock->reserveFromCartLines($user, [['id' => $datafono->id, 'cantidad' => 1]]);

    $pNull->update(['payment_method' => null, 'created_at' => now()->subHours(2)]);
    $pEntregado->update(['entregado' => true, 'created_at' => now()->subHours(2)]);
    $pDatafono->update(['payment_method' => 'datafono', 'created_at' => now()->subHours(2)]);

    expect($stock->releaseExpiredUnpaid())->toBe(0)
        ->and(Pedido::query()->whereKey([$pNull->id, $pEntregado->id, $pDatafono->id])->count())->toBe(3)
        ->and((int) $sinMetodo->fresh()->unidades)->toBe(2)
        ->and((int) $entregado->fresh()->unidades)->toBe(2)
        ->and((int) $datafono->fresh()->unidades)->toBe(2);
});
