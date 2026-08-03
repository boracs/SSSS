<?php

declare(strict_types=1);

use App\DTOs\Rentals\RentalRequestDto;
use App\DTOs\Rentals\RentalWindowDto;
use App\Models\Booking;
use App\Models\Surfboard;
use App\Services\BookingService;
use App\Support\BusinessDateTime;

/**
 * Disponibilidad de alquiler sobre la ventana de INVENTARIO (return + buffer).
 * La reserva base ocupa 10:00 → 12:00 y bloquea hasta las 12:30.
 */
beforeEach(function () {
    config([
        'services.academy.business_timezone' => 'Europe/Madrid',
        'rentals.turnover_buffer_minutes' => 30,
        'rentals.day_mode_pickup_hour' => 12,
        'rentals.pricing_step_minutes' => 30,
        'rentals.deposit_percentage' => 30,
    ]);

    $this->service = app(BookingService::class);
    $this->board = Surfboard::factory()->create();
    $this->booking = Booking::factory()
        ->for($this->board)
        ->hourWindow(rentalMoment('2026-08-10 10:00:00'), 120)
        ->create();
});

function rentalMoment(string $datetime): Illuminate\Support\Carbon
{
    return BusinessDateTime::parseInAppTimezone($datetime);
}

test('el buffer de rotación forma parte de la ventana bloqueada', function () {
    $ocupado = $this->service->checkAvailability(
        $this->board->id,
        rentalMoment('2026-08-10 12:15:00'),
        rentalMoment('2026-08-10 13:00:00'),
    );

    expect($ocupado)->toBeFalse();
});

test('los extremos que se tocan no colisionan', function () {
    // Empieza justo cuando acaba el buffer de la anterior.
    expect($this->service->checkAvailability(
        $this->board->id,
        rentalMoment('2026-08-10 12:30:00'),
        rentalMoment('2026-08-10 14:00:00'),
    ))->toBeTrue();

    // Acaba justo cuando empieza la recogida de la anterior.
    expect($this->service->checkAvailability(
        $this->board->id,
        rentalMoment('2026-08-10 08:00:00'),
        rentalMoment('2026-08-10 10:00:00'),
    ))->toBeTrue();
});

test('cualquier solape con el tiempo cobrado bloquea', function () {
    expect($this->service->checkAvailability(
        $this->board->id,
        rentalMoment('2026-08-10 11:00:00'),
        rentalMoment('2026-08-10 11:30:00'),
    ))->toBeFalse();
});

test('otra tabla del mismo esquema sigue libre', function () {
    $otra = Surfboard::factory()->create(['price_schema_id' => $this->board->price_schema_id]);

    expect($this->service->checkAvailability(
        $otra->id,
        rentalMoment('2026-08-10 10:00:00'),
        rentalMoment('2026-08-10 12:30:00'),
    ))->toBeTrue();
});

test('una reserva cancelada no bloquea la tabla', function () {
    $this->booking->update(['status' => Booking::STATUS_CANCELLED]);

    expect($this->service->checkAvailability(
        $this->board->id,
        rentalMoment('2026-08-10 10:00:00'),
        rentalMoment('2026-08-10 12:30:00'),
    ))->toBeTrue();
});

test('la propia reserva se excluye al recolocarla', function () {
    expect($this->service->checkAvailability(
        $this->board->id,
        rentalMoment('2026-08-10 10:00:00'),
        rentalMoment('2026-08-10 12:30:00'),
        $this->booking->id,
    ))->toBeTrue();
});

test('getBlockedRanges publica la ventana de inventario en hora de escuela', function () {
    $ranges = $this->service->getBlockedRanges(
        $this->board->id,
        rentalMoment('2026-08-01 00:00:00'),
        rentalMoment('2026-08-31 23:59:59'),
    );

    expect($ranges)->toHaveCount(1);
    expect($ranges[0]['start'])->toBe('2026-08-10T10:00:00+02:00');
    expect($ranges[0]['return_at'])->toBe('2026-08-10T12:00:00+02:00');
    // El calendario bloquea hasta el final del buffer, no hasta la devolución.
    expect($ranges[0]['end'])->toBe('2026-08-10T12:30:00+02:00');
    expect($ranges[0]['display_status'])->toBe('pendiente');
});

test('una reserva con el pago confirmado se muestra como ocupada', function () {
    $this->booking->update(['payment_status' => Booking::PAYMENT_CONFIRMED]);

    $ranges = $this->service->getBlockedRanges(
        $this->board->id,
        rentalMoment('2026-08-10 00:00:00'),
        rentalMoment('2026-08-10 23:59:59'),
    );

    expect($ranges[0]['display_status'])->toBe('ocupado');
});

test('la hora de la escuela no se desplaza aunque el proceso corra en UTC', function () {
    $original = date_default_timezone_get();

    try {
        date_default_timezone_set('UTC');

        $fresh = $this->booking->fresh();
        $ranges = $this->service->getBlockedRanges(
            $this->board->id,
            rentalMoment('2026-08-10 00:00:00'),
            rentalMoment('2026-08-10 23:59:59'),
        );

        expect($fresh->pickup_at->format('Y-m-d H:i'))->toBe('2026-08-10 10:00');
        expect($fresh->pickup_at->timezone->getName())->toBe('Europe/Madrid');
        expect($ranges[0]['start'])->toBe('2026-08-10T10:00:00+02:00');
    } finally {
        date_default_timezone_set($original);
    }
});

test('el modo día bloquea de 12:00 a 12:00 más el buffer', function () {
    $board = Surfboard::factory()->create();
    Booking::factory()->for($board)->dayWindow(rentalMoment('2026-09-01 00:00:00'), 2)->create();

    expect($this->service->checkAvailability(
        $board->id,
        rentalMoment('2026-09-03 12:00:00'),
        rentalMoment('2026-09-03 13:00:00'),
    ))->toBeFalse();

    expect($this->service->checkAvailability(
        $board->id,
        rentalMoment('2026-09-03 12:30:00'),
        rentalMoment('2026-09-04 12:30:00'),
    ))->toBeTrue();
});

test('crear una reserva cobra el pack y bloquea con el buffer', function () {
    $board = Surfboard::factory()->create();
    $window = $this->service->buildWindow(new RentalRequestDto(
        startDate: '2026-08-12T10:00',
        mode: RentalWindowDto::MODE_HOUR,
        packMinutes: 120,
    ));

    $booking = $this->service->createPendingBooking($board, $window, [
        'client_name' => 'Ane Test',
        'client_email' => 'ane@example.com',
    ]);

    expect((float) $booking->total_price)->toBe(16.0);
    expect((float) $booking->deposit_amount)->toBe(4.8);
    expect($booking->block_end->format('H:i'))->toBe('12:30');
    expect($booking->pack_minutes)->toBe(120);

    // La misma ventana ya no se puede volver a reservar.
    expect(fn () => $this->service->createPendingBooking($board, $window, ['client_name' => 'Otro']))
        ->toThrow(InvalidArgumentException::class);
});
