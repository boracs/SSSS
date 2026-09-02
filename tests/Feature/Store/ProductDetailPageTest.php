<?php

declare(strict_types=1);

use App\Models\Imagen;
use App\Models\Producto;
use App\Services\Store\ProductDetailPageService;
use Illuminate\Support\Facades\Storage;

test('ficha producto sirve el webp si el RAW de BD ya no está en disco', function () {
    Storage::fake('public');
    Storage::disk('public')->put('productos/neopreno-traje-frontal.webp', 'webp-bytes');

    $producto = Producto::factory()->create(['eliminado' => false]);
    Imagen::query()->create([
        'nombre' => 'neopreno-traje-frontal.png',
        'ruta' => 'productos/neopreno-traje-frontal.png',
        'producto_id' => $producto->id,
        'es_principal' => true,
    ]);

    $page = app(ProductDetailPageService::class)->forInertia($producto->fresh(['imagenes']));

    expect($page['producto']['imagen_principal'])->toContain('neopreno-traje-frontal.webp')
        ->and($page['producto']['imagen_principal'])->not->toContain('.png')
        ->and($page['producto']['gallery'][0])->toContain('.webp');
});
