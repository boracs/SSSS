<?php

declare(strict_types=1);

use App\Models\Carrito;
use App\Models\Producto;

test('añadir al carrito respeta la cantidad pedida', function () {
    $user = socioConTaquillaAlDia();
    $producto = Producto::factory()->create([
        'unidades' => 8,
        'eliminado' => false,
        'descuento' => 0,
        'precio' => 10,
    ]);

    $this->actingAs($user)
        ->post(route('carrito.agregar', $producto->id), ['cantidad' => 2])
        ->assertRedirect();

    $carrito = Carrito::query()->where('user_id', $user->id)->first();
    expect($carrito)->not->toBeNull()
        ->and((int) $carrito->productos()->where('producto_id', $producto->id)->first()?->pivot->cantidad)->toBe(2);

    $this->actingAs($user)
        ->post(route('carrito.agregar', $producto->id), ['cantidad' => 3])
        ->assertRedirect();

    expect((int) $carrito->fresh()->productos()->where('producto_id', $producto->id)->first()?->pivot->cantidad)->toBe(5);
});
