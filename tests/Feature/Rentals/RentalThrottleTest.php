<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;

/**
 * El throttle en sí (esperar a que salte un 429) es un candidato clásico a
 * test flaky por timing; en su lugar fijamos el CONTRATO de la ruta: que el
 * middleware `throttle` está enganchado con los límites acordados. Si alguien
 * lo quita o cambia el número sin querer, este test lo dice sin depender de
 * disparar de verdad el límite.
 */
test('la reserva pública lleva un throttle estricto', function () {
    $route = collect(Route::getRoutes())->first(
        fn ($r) => $r->getName() === 'rentals.bookings.store'
    );

    expect($route)->not->toBeNull();
    expect($route->middleware())->toContain('throttle:8,1');
});

test('la consulta de disponibilidad lleva un throttle más holgado', function () {
    $route = collect(Route::getRoutes())->first(
        fn ($r) => $r->getName() === 'rentals.bookings.check-availability'
    );

    expect($route)->not->toBeNull();
    expect($route->middleware())->toContain('throttle:40,1');
});
