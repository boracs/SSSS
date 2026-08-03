<?php

declare(strict_types=1);

use App\Models\Booking;
use App\Models\Surfboard;
use App\Models\User;
use App\Support\BusinessDateTime;

/**
 * Hardening alquiler #3 (cierre):
 * A) check-availability público no filtra metadatos internos (id, status crudo).
 * B) markPickedUp exige pago confirmado antes de entregar la tabla.
 */
beforeEach(function () {
    config([
        'services.academy.business_timezone' => 'Europe/Madrid',
        'rentals.turnover_buffer_minutes' => 30,
    ]);

    $this->board = Surfboard::factory()->create();
});

// ── A) Slim check-availability ────────────────────────────────

test('el check-availability público no expone el id de la reserva ni el estado interno', function () {
    Booking::factory()
        ->for($this->board)
        ->hourWindow(BusinessDateTime::parseInAppTimezone('2026-08-10 10:00:00'), 120)
        ->create();

    $response = $this->getJson(route('rentals.bookings.check-availability', [
        'surfboard_id' => $this->board->id,
        'from' => '2026-08-01',
        'to' => '2026-08-31',
    ]))->assertOk();

    $ranges = $response->json('blocked_ranges');
    expect($ranges)->toHaveCount(1);

    // Shape exacto: solo start/end/display_status, nada de id ni status crudo.
    expect(array_keys($ranges[0]))->toEqualCanonicalizing(['start', 'end', 'display_status']);
    expect($ranges[0])->not->toHaveKey('id');
    expect($ranges[0])->not->toHaveKey('return_at');
    expect($ranges[0])->not->toHaveKey('status');
    expect($ranges[0]['display_status'])->toBe('pendiente');
});

test('el check-availability admin sigue devolviendo el id de la reserva', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $booking = Booking::factory()
        ->for($this->board)
        ->hourWindow(BusinessDateTime::parseInAppTimezone('2026-08-10 10:00:00'), 120)
        ->create();

    $response = $this->actingAs($admin)->getJson(route('admin.bookings.check-availability', [
        'surfboard_id' => $this->board->id,
        'from' => '2026-08-01',
        'to' => '2026-08-31',
    ]))->assertOk();

    $ranges = $response->json('blocked_ranges');
    expect($ranges)->toHaveCount(1);
    expect($ranges[0]['id'])->toBe($booking->id);
    expect($ranges[0])->toHaveKey('return_at');
    expect($ranges[0])->toHaveKey('status');
});

test('el calendario público sigue tachando el solape con buffer aunque el payload sea más delgado', function () {
    Booking::factory()
        ->for($this->board)
        ->hourWindow(BusinessDateTime::parseInAppTimezone('2026-08-10 10:00:00'), 120)
        ->create();

    // Ventana pisando el buffer (12:00-12:30): sigue bloqueada.
    $response = $this->getJson(route('rentals.bookings.check-availability', [
        'surfboard_id' => $this->board->id,
        'from' => '2026-08-10',
        'to' => '2026-08-10',
    ]))->assertOk();

    $range = $response->json('blocked_ranges.0');
    expect($range['start'])->toBe('2026-08-10T10:00:00+02:00');
    expect($range['end'])->toBe('2026-08-10T12:30:00+02:00');
});

// ── B) markPickedUp exige pago confirmado ─────────────────────

test('el admin no puede marcar recogida sin pago confirmado', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $booking = Booking::factory()
        ->for($this->board)
        ->hourWindow(BusinessDateTime::parseInAppTimezone('2026-08-10 10:00:00'), 120)
        ->create(['payment_status' => Booking::PAYMENT_PENDING]);

    $this->actingAs($admin)
        ->patch(route('admin.bookings.mark-picked-up', $booking))
        ->assertSessionHas('error');

    expect($booking->fresh()->picked_up_at)->toBeNull();
});

test('el admin sí puede marcar recogida con el pago confirmado', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $booking = Booking::factory()
        ->for($this->board)
        ->hourWindow(BusinessDateTime::parseInAppTimezone('2026-08-10 10:00:00'), 120)
        ->create([
            'status' => Booking::STATUS_CONFIRMED,
            'payment_status' => Booking::PAYMENT_CONFIRMED,
        ]);

    $this->actingAs($admin)
        ->patch(route('admin.bookings.mark-picked-up', $booking))
        ->assertSessionHas('success');

    expect($booking->fresh()->picked_up_at)->not->toBeNull();
});

test('el listado admin recibe payment_status para pintar el botón de recogida', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    Booking::factory()
        ->for($this->board)
        ->hourWindow(BusinessDateTime::parseInAppTimezone('2026-08-10 10:00:00'), 120)
        ->create(['payment_status' => Booking::PAYMENT_PENDING]);

    $this->actingAs($admin)
        ->get(route('admin.bookings.index'))
        ->assertInertia(fn ($page) => $page
            ->has('bookings.data.0.payment_status')
            ->where('bookings.data.0.payment_status', Booking::PAYMENT_PENDING)
        );
});
