<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;

test('taquilla.index.admin resuelve al panel web y no a /api/taquilla', function () {
    expect(parse_url(route('taquilla.index.admin'), PHP_URL_PATH))
        ->toBe('/taquilla/admin/index');

    $apiDuplicate = collect(Route::getRoutes())
        ->contains(fn ($route) => $route->uri() === 'api/taquilla');

    expect($apiDuplicate)->toBeFalse();

    $this->getJson('/api/taquilla')->assertNotFound();
});

test('ninguna ruta apunta a AuthController@login', function () {
    $pointsToDeadController = collect(Route::getRoutes())->contains(function ($route) {
        return str_contains($route->getActionName(), 'Controllers\\AuthController');
    });

    expect($pointsToDeadController)->toBeFalse();
});
