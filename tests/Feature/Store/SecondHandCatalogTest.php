<?php

declare(strict_types=1);

use App\Enums\SecondHandBoardType;
use App\Enums\SecondHandStatus;
use App\Models\SecondHandBoard;

test('el catálogo público incluye disponibles y reservadas, no vendidas', function () {
    $available = SecondHandBoard::factory()->create([
        'status' => SecondHandStatus::AVAILABLE,
        'name' => 'Tabla disponible test',
        'description' => 'No debe ir al listado',
    ]);
    $reserved = SecondHandBoard::factory()->reserved()->create([
        'name' => 'Tabla reservada test',
    ]);
    $sold = SecondHandBoard::factory()->sold()->create([
        'name' => 'Tabla vendida test',
    ]);

    $this->get(route('second-hand.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('SecondHand/Index')
            ->has('boards', 2)
            ->where('catalogMeta.total', 2)
            ->where('boards.0.id', $available->id)
            ->where('boards.1.id', $reserved->id)
            ->missing('boards.0.description')
            ->missing('boards.0.images')
            ->missing('boards.0.purchase_price')
            ->has('boards.0.height_label')
            ->has('filterOptions.type'));

    $this->get(route('second-hand.show', $available))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('SecondHand/Show')
            ->where('board.id', $available->id)
            ->has('board.description')
            ->has('board.images')
            ->missing('board.purchase_price'));

    $this->get(route('second-hand.show', $reserved))->assertOk();
    $this->get(route('second-hand.show', $sold))->assertNotFound();
});

test('el filtro tipo y la búsqueda viajan en la query', function () {
    SecondHandBoard::factory()->create([
        'name' => 'Pukas Ghost',
        'brand' => 'Pukas',
        'model' => 'Ghost',
        'board_type' => SecondHandBoardType::HARDBOARD,
        'height' => 6.2,
        'volume' => 32,
        'sale_price' => 40000,
        'discount_pct' => 0,
    ]);
    SecondHandBoard::factory()->create([
        'name' => 'Catch Surf Log',
        'brand' => 'Catch Surf',
        'model' => 'Log',
        'board_type' => SecondHandBoardType::SOFTBOARD,
        'height' => 7.0,
        'volume' => 50,
        'sale_price' => 25000,
        'discount_pct' => 0,
    ]);

    $this->get(route('second-hand.index', ['tipo' => 'softboard', 'q' => 'Catch']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('SecondHand/Index')
            ->has('boards', 1)
            ->where('boards.0.board_type', 'softboard')
            ->where('filters.tipo', 'softboard')
            ->where('filters.q', 'Catch')
            ->where('catalogMeta.filtersActive', true)
            ->where('catalogMeta.total', 2)
            ->where('catalogMeta.matched', 1));
});

test('la ficha publica la longitud en pies y pulgadas', function () {
    $board = SecondHandBoard::factory()->create([
        'height' => 5.83,
        'status' => SecondHandStatus::AVAILABLE,
    ]);

    $this->get(route('second-hand.show', $board))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('board.height_label', "5'10\""));
});
