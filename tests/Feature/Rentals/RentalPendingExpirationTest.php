<?php

declare(strict_types=1);

use App\Models\Booking;
use App\Models\Surfboard;
use App\Services\BookingService;
use App\Support\BusinessDateTime;
use Illuminate\Support\Carbon;

/**
 * Dos velocidades de caducidad para una reserva pending:
 *   - pública (Stripe Checkout): minutos, config rentals.pending_unpaid_expiration_minutes.
 *   - manual (Admin, cobro en mostrador): días, config rentals.pending_expiration_days.
 * autoExpirePending() libera cualquiera de las dos en cuanto vence expires_at.
 */
beforeEach(function () {
    config([
        'services.academy.business_timezone' => 'Europe/Madrid',
        'rentals.turnover_buffer_minutes' => 30,
        'rentals.pending_unpaid_expiration_minutes' => 45,
        'rentals.pending_expiration_days' => 7,
    ]);

    $this->service = app(BookingService::class);
    $this->board = Surfboard::factory()->create();
});

test('la caducidad corta sale de config, no de los 7 días de gracia', function () {
    config(['rentals.pending_unpaid_expiration_minutes' => 20]);

    expect(app(BookingService::class)->pendingUnpaidExpirationMinutes())->toBe(20);
});

test('createPendingBooking con caducidad corta expira en minutos', function () {
    Carbon::setTestNow(BusinessDateTime::parseInAppTimezone('2026-08-10 09:00:00'));

    $window = $this->service->normalizeHourWindow(BusinessDateTime::parseInAppTimezone('2026-08-10 10:00:00'), 120);
    $booking = $this->service->createPendingBooking(
        $this->board,
        $window,
        ['client_name' => 'Ane Test'],
        expiresInMinutes: $this->service->pendingUnpaidExpirationMinutes(),
    );

    expect($booking->expires_at->format('Y-m-d H:i'))->toBe('2026-08-10 09:45');

    Carbon::setTestNow();
});

test('sin caducidad explícita se mantiene la gracia larga (admin, pago manual)', function () {
    Carbon::setTestNow(BusinessDateTime::parseInAppTimezone('2026-08-10 09:00:00'));

    $window = $this->service->normalizeHourWindow(BusinessDateTime::parseInAppTimezone('2026-08-10 10:00:00'), 120);
    $booking = $this->service->createPendingBooking($this->board, $window, ['client_name' => 'Ane Test']);

    expect($booking->expires_at->format('Y-m-d H:i'))->toBe('2026-08-17 09:00');

    Carbon::setTestNow();
});

test('una pending sin pago vencida deja de bloquear tras autoExpirePending', function () {
    $vencida = Booking::factory()
        ->for($this->board)
        ->hourWindow(BusinessDateTime::parseInAppTimezone('2026-08-12 10:00:00'), 120)
        ->create(['expires_at' => BusinessDateTime::now()->subMinute()]);

    expect(Booking::query()->blocking()->count())->toBe(1);

    $expired = $this->service->autoExpirePending();

    expect($expired->pluck('id')->all())->toBe([$vencida->id]);
    expect($vencida->fresh()->status)->toBe(Booking::STATUS_CANCELLED);
    expect(Booking::query()->blocking()->count())->toBe(0);

    expect($this->service->checkAvailability(
        $this->board->id,
        BusinessDateTime::parseInAppTimezone('2026-08-12 10:00:00'),
        BusinessDateTime::parseInAppTimezone('2026-08-12 12:30:00'),
    ))->toBeTrue();
});

test('una pending que todavía no ha vencido sigue bloqueando', function () {
    Booking::factory()
        ->for($this->board)
        ->hourWindow(BusinessDateTime::parseInAppTimezone('2026-08-12 10:00:00'), 120)
        ->create(['expires_at' => BusinessDateTime::now()->addMinutes(45)]);

    expect($this->service->autoExpirePending())->toBeEmpty();
    expect(Booking::query()->blocking()->count())->toBe(1);
});

test('una reserva con el pago confirmado no caduca aunque expires_at haya pasado', function () {
    $pagada = Booking::factory()
        ->for($this->board)
        ->hourWindow(BusinessDateTime::parseInAppTimezone('2026-08-12 10:00:00'), 120)
        ->fullyPaid()
        ->create(['expires_at' => BusinessDateTime::now()->subMinute()]);

    expect($this->service->autoExpirePending())->toBeEmpty();

    $pagada->refresh();
    expect($pagada->status)->toBe(Booking::STATUS_CONFIRMED);
    expect(Booking::query()->blocking()->count())->toBe(1);
});
