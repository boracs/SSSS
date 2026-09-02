<?php

declare(strict_types=1);

use App\Enums\SecondHandStatus;
use App\Models\Producto;
use App\Models\SecondHandBoard;
use App\Models\User;
use App\Services\Vip\VipMembershipService;

test('el catálogo público de segunda mano no filtra purchase_price ni margen', function () {
    SecondHandBoard::factory()->create([
        'status' => SecondHandStatus::AVAILABLE,
        'purchase_price' => 99900,
        'name' => 'Tabla R5',
    ]);

    $this->get(route('second-hand.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->missing('boards.0.purchase_price')
            ->missing('boards.0.margen')
            ->missing('boards.0.numeroTaquilla'));
});

test('la tienda pública no filtra purchase_price, margen ni códigos de taquilla', function () {
    Producto::factory()->create([
        'eliminado' => 0,
        'nombre' => 'Wax R5',
    ]);

    $this->get(route('tienda'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->missing('productos.0.purchase_price')
            ->missing('productos.0.margen')
            ->missing('productos.0.numeroTaquilla'));
});

test('el catálogo de subastas no filtra purchase_price ni códigos de taquilla', function () {
    $user = User::factory()->create(['role' => 'user', 'numeroTaquilla' => null]);
    $vip = app(VipMembershipService::class)->activate($user);

    $this->actingAs($vip)
        ->get(route('auctions.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->missing('auctions.0.purchase_price')
            ->missing('auctions.0.margen')
            ->missing('auctions.0.numeroTaquilla'));
});
