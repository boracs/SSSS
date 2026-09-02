<?php

declare(strict_types=1);

use App\Models\Producto;
use App\Models\User;

/**
 * El catálogo que alimenta el ticket de mostrador debe emitir el MISMO precio
 * que después valida `createPaidPedido` (StoreProductPricing). Cuando emitía el
 * PVP sin rebajar, cualquier producto con descuento cerraba con 422
 * «Importe línea ≠ catálogo».
 */
test('el catálogo del datáfono emite el precio ya rebajado', function () {
    $admin = User::factory()->create(['role' => 'admin']);

    $rebajado = Producto::factory()->create([
        'nombre' => 'AAA Neopreno rebajado',
        'precio' => 100.00,
        'descuento' => 25,
        'unidades' => 4,
        'eliminado' => false,
    ]);

    $this->actingAs($admin)
        ->get(route('admin.payments.datafono.index'))
        ->assertOk()
        ->assertInertia(function ($page) use ($rebajado) {
            $producto = collect($page->toArray()['props']['productos'])
                ->firstWhere('id', $rebajado->id);

            expect($producto)->not->toBeNull()
                ->and($producto['precio_cents'])->toBe(7500)
                ->and($producto['precio_base_cents'])->toBe(10000)
                ->and($producto['descuento'])->toBe(25);
        });
});

test('un producto sin descuento emite el mismo precio base y rebajado', function () {
    $admin = User::factory()->create(['role' => 'admin']);

    $normal = Producto::factory()->create([
        'nombre' => 'AAA Parafina',
        'precio' => 6.50,
        'descuento' => 0,
        'unidades' => 4,
        'eliminado' => false,
    ]);

    $this->actingAs($admin)
        ->get(route('admin.payments.datafono.index'))
        ->assertOk()
        ->assertInertia(function ($page) use ($normal) {
            $producto = collect($page->toArray()['props']['productos'])
                ->firstWhere('id', $normal->id);

            expect($producto['precio_cents'])->toBe(650)
                ->and($producto['precio_base_cents'])->toBe(650)
                ->and($producto['descuento'])->toBe(0);
        });
});
