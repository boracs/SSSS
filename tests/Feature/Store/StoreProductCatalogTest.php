<?php

declare(strict_types=1);

use App\DTOs\Store\StoreProductWriteDto;
use App\Models\Imagen;
use App\Models\Producto;
use App\Models\User;
use App\Services\Store\StoreProductCatalogService;

test('crear producto redondea el precio a céntimos y no pasa modelos crudos al listado admin', function () {
    $catalog = app(StoreProductCatalogService::class);
    $producto = $catalog->create(StoreProductWriteDto::fromValidated([
        'nombre' => 'Wax tropical',
        'precio' => 9.999,
        'unidades' => 4,
        'descuento' => 10,
        'eliminado' => false,
        'tags' => [],
    ]));

    expect((float) $producto->precio)->toBe(10.0)
        ->and((int) $producto->unidades)->toBe(4);

    $rows = $catalog->adminIndexRows();
    expect($rows)->toHaveCount(1)
        ->and($rows[0])->toHaveKeys(['id', 'nombre', 'precio', 'imagen_principal', 'tags'])
        ->and($rows[0]['precio'])->toBe(10.0);
});

test('toggle ocultar producto no borra la fila', function () {
    $producto = Producto::factory()->create(['eliminado' => false]);
    $catalog = app(StoreProductCatalogService::class);

    $hidden = $catalog->toggleEliminado($producto);
    expect((bool) $hidden->eliminado)->toBeTrue()
        ->and(Producto::query()->whereKey($producto->id)->exists())->toBeTrue();

    $visible = $catalog->toggleEliminado($hidden);
    expect((bool) $visible->eliminado)->toBeFalse();
});

test('cambiar imagen principal exige que la foto sea del producto', function () {
    $producto = Producto::factory()->create(['eliminado' => false]);
    $otro = Producto::factory()->create(['eliminado' => false]);
    $propia = Imagen::query()->create([
        'nombre' => 'a.jpg',
        'ruta' => 'productos/a.jpg',
        'producto_id' => $producto->id,
        'es_principal' => true,
    ]);
    $ajena = Imagen::query()->create([
        'nombre' => 'b.jpg',
        'ruta' => 'productos/b.jpg',
        'producto_id' => $otro->id,
        'es_principal' => true,
    ]);

    $catalog = app(StoreProductCatalogService::class);
    $catalog->setPrincipalImage($producto, (int) $propia->id);

    expect((bool) $propia->fresh()->es_principal)->toBeTrue();

    $catalog->setPrincipalImage($producto, (int) $ajena->id);
})->throws(InvalidArgumentException::class);

test('un socio no admin no puede crear productos', function () {
    $user = User::factory()->create(['role' => 'user']);

    $this->actingAs($user)
        ->post(route('producto.create'), [
            'nombre' => 'Hack',
            'precio' => 1,
            'unidades' => 1,
        ])
        ->assertForbidden();
});

test('un admin puede crear un producto por HTTP', function () {
    $admin = User::factory()->create(['role' => 'admin']);

    $this->actingAs($admin)
        ->post(route('producto.create'), [
            'nombre' => 'Lycra club',
            'precio' => 24.5,
            'unidades' => 2,
            'descuento' => 0,
        ])
        ->assertRedirect(route('mostrar.productos'));

    expect(Producto::query()->where('nombre', 'Lycra club')->exists())->toBeTrue();
});
