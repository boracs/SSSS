<?php

declare(strict_types=1);

use App\Models\Booking;
use App\Models\Surfboard;
use App\Models\User;

/**
 * `/api/bookings/check-availability` responde con el detalle de mostrador
 * (`BookingService::getBlockedRanges`: id y estado crudo de cada reserva). Con solo `auth`
 * cualquier socio podía enumerar la agenda interna. El calendario público no usa esta ruta:
 * va por `rentals.bookings.check-availability`, que devuelve el payload sin ids.
 */
beforeEach(function () {
    $this->board = Surfboard::factory()->create();
});

function apiAvailabilityQuery(int $surfboardId): string
{
    return '/api/bookings/check-availability?'.http_build_query([
        'surfboard_id' => $surfboardId,
        'from' => now()->toDateString(),
        'to' => now()->addDays(7)->toDateString(),
    ]);
}

test('un socio autenticado no puede leer la agenda interna por la API', function () {
    $socio = User::factory()->create(['role' => 'user']);

    $this->actingAs($socio)
        ->getJson(apiAvailabilityQuery($this->board->id))
        ->assertForbidden();
});

test('un visitante sin sesión tampoco puede', function () {
    $this->getJson(apiAvailabilityQuery($this->board->id))
        ->assertUnauthorized();
});

test('el mostrador sí puede y sigue recibiendo el detalle con id', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    Booking::factory()
        ->for($this->board)
        ->create([
            'start_date' => now()->addDay()->setTime(12, 0),
            'end_date' => now()->addDays(2)->setTime(12, 0),
            'status' => Booking::STATUS_CONFIRMED,
        ]);

    $response = $this->actingAs($admin)
        ->getJson(apiAvailabilityQuery($this->board->id))
        ->assertOk();

    expect($response->json('blocked_ranges.0'))->toHaveKeys(['id', 'start', 'end', 'status']);
});
