<?php

declare(strict_types=1);

use App\Models\PhotoSession;
use App\Models\User;
use App\Services\Photos\PhotoBookingService;
use App\Support\BusinessDateTime;

test('createBooking congela base + (personas × plus)', function () {
    $session = PhotoSession::query()->create([
        'nombre' => 'Pack 2h test',
        'descripcion' => 'Base + plus',
        'precio_cents' => 5000,
        'plus_por_persona_cents' => 1000,
        'duracion_minutos' => 120,
        'capacidad_maxima' => 5,
        'fotografo_user_id' => null,
        'activo' => true,
    ]);

    $user = User::factory()->create(['role' => 'user']);

    $booking = app(PhotoBookingService::class)->createBooking([
        'photo_session_id' => $session->id,
        'fecha_inicio' => BusinessDateTime::now()->addDay()->setTime(10, 0)->toDateTimeString(),
        'party_size' => 3,
        'user_id' => $user->id,
        'guest_first_name' => $user->nombre,
        'guest_email' => $user->email,
        'is_admin_guest' => false,
    ]);

    // 5000 + (3 × 1000) = 8000
    expect($booking->precio_pagado_cents)->toBe(8000)
        ->and($booking->party_size)->toBe(3);
});

test('quotePriceCents con plus 0 deja solo el precio base', function () {
    $session = PhotoSession::query()->create([
        'nombre' => 'Pack sin plus',
        'precio_cents' => 8000,
        'plus_por_persona_cents' => 0,
        'duracion_minutos' => 60,
        'capacidad_maxima' => 5,
        'activo' => true,
    ]);

    expect(app(PhotoBookingService::class)->quotePriceCents($session, 5))->toBe(8000);
});

test('createBooking respeta override explicito de precio_pagado_cents', function () {
    $session = PhotoSession::query()->create([
        'nombre' => 'Pack override',
        'precio_cents' => 8000,
        'plus_por_persona_cents' => 500,
        'duracion_minutos' => 60,
        'capacidad_maxima' => null,
        'activo' => true,
    ]);

    $booking = app(PhotoBookingService::class)->createBooking([
        'photo_session_id' => $session->id,
        'fecha_inicio' => BusinessDateTime::now()->addDays(2)->setTime(11, 0)->toDateTimeString(),
        'party_size' => 2,
        'is_admin_guest' => true,
        'guest_first_name' => 'Ana',
        'guest_email' => 'ana@example.test',
        'precio_pagado_cents' => 5500,
    ]);

    expect($booking->precio_pagado_cents)->toBe(5500);
});
