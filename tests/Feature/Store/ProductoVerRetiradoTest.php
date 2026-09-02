<?php

declare(strict_types=1);

use App\Models\Producto;

/**
 * Un producto retirado del catálogo (`eliminado = 1`) no aparece en tienda ni en el
 * sitemap, pero su URL directa seguía devolviendo 200 con `index, follow`: soft-404
 * indexable. Debe ser 404.
 */
test('la ficha de un producto retirado devuelve 404', function () {
    $producto = Producto::factory()->create(['eliminado' => true]);

    $this->get(route('producto.ver', $producto->id))->assertNotFound();
});

test('la ficha de un producto activo sigue siendo indexable', function () {
    $producto = Producto::factory()->create(['eliminado' => false]);

    $this->get(route('producto.ver', $producto->id))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('ProductoVer')
            ->where('seo.robots', 'index, follow'));
});
