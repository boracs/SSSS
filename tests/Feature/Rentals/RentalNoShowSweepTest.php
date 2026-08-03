<?php

declare(strict_types=1);

use App\Models\Booking;
use App\Models\Surfboard;
use App\Services\BookingService;
use App\Support\BusinessDateTime;
use Illuminate\Support\Carbon;

/**
 * Barrido de no-shows: hoy está APAGADO (config rentals.no_show_release_enabled)
 * porque el mostrador acaba de estrenar el registro de recogida. Solo la
 * liberación manual por reserva devuelve la tabla al inventario.
 */
beforeEach(function () {
    config([
        'services.academy.business_timezone' => 'Europe/Madrid',
        'rentals.turnover_buffer_minutes' => 30,
        'rentals.no_show_grace_minutes' => 30,
        'rentals.no_show_lookback_hours' => 24,
    ]);

    // Reserva a las 10:00 y mostrador mirando el reloj a las 13:00.
    Carbon::setTestNow(BusinessDateTime::parseInAppTimezone('2026-08-10 13:00:00'));

    $this->service = app(BookingService::class);
    $this->board = Surfboard::factory()->create();
    $this->booking = Booking::factory()
        ->for($this->board)
        ->hourWindow(BusinessDateTime::parseInAppTimezone('2026-08-10 10:00:00'), 120)
        ->create();
});

afterEach(function () {
    Carbon::setTestNow();
});

test('el barrido automático sigue apagado y no libera nada', function () {
    expect(config('rentals.no_show_release_enabled'))->toBeFalse();
    expect($this->service->isNoShowSweepEnabled())->toBeFalse();

    // La reserva sí es candidata: lo que falta es la decisión de encender el cron.
    expect($this->service->noShowCandidates()->pluck('id')->all())->toBe([$this->booking->id]);

    expect($this->service->releaseNoShows())->toBeEmpty();
    expect($this->booking->fresh()->no_show_at)->toBeNull();
    expect($this->booking->fresh()->status)->toBe(Booking::STATUS_PENDING);
});

test('la liberación manual cancela la reserva y devuelve la tabla al inventario', function () {
    expect($this->service->releaseIfNoShow($this->booking))->toBeTrue();

    $released = $this->booking->fresh();
    expect($released->no_show_at)->not->toBeNull();
    expect($released->status)->toBe(Booking::STATUS_CANCELLED);
    expect($released->admin_notes)->toContain('No-show');

    expect($this->service->checkAvailability(
        $this->board->id,
        BusinessDateTime::parseInAppTimezone('2026-08-10 10:00:00'),
        BusinessDateTime::parseInAppTimezone('2026-08-10 12:30:00'),
    ))->toBeTrue();
});

test('liberar dos veces la misma reserva no la vuelve a marcar', function () {
    $this->service->releaseIfNoShow($this->booking);
    $marcada = $this->booking->fresh()->no_show_at;

    expect($this->service->releaseIfNoShow($this->booking->fresh()))->toBeFalse();
    expect($this->booking->fresh()->no_show_at->equalTo($marcada))->toBeTrue();
});

test('registrar la recogida saca la reserva del barrido', function () {
    // markPickedUp exige pago confirmado (hardening #3): la reserva por defecto
    // del beforeEach nace en payment_status pending para servir de candidata al
    // barrido, así que aquí se confirma el pago antes de simular la entrega.
    $this->booking->update(['payment_status' => Booking::PAYMENT_CONFIRMED]);

    $this->service->markPickedUp($this->booking, BusinessDateTime::parseInAppTimezone('2026-08-10 10:20:00'));

    expect($this->service->noShowCandidates())->toBeEmpty();
    expect($this->service->releaseIfNoShow($this->booking->fresh()))->toBeFalse();
});

test('el alquiler prepagado entero queda protegido, la señal del 30 % no', function () {
    $prepagada = Booking::factory()
        ->for(Surfboard::factory())
        ->hourWindow(BusinessDateTime::parseInAppTimezone('2026-08-10 10:00:00'), 120)
        ->fullyPaid()
        ->create();

    $conSenal = Booking::factory()
        ->for(Surfboard::factory())
        ->hourWindow(BusinessDateTime::parseInAppTimezone('2026-08-10 10:00:00'), 120)
        ->depositPaid()
        ->create();

    $candidatas = $this->service->noShowCandidates()->pluck('id')->all();

    expect($candidatas)->not->toContain($prepagada->id);
    // Comportamiento ACTUAL: la señal no protege (decisión de producto pendiente).
    expect($candidatas)->toContain($conSenal->id);
    expect($this->service->noShowProtectedByPayment()->pluck('id')->all())->toBe([$prepagada->id]);
    expect($this->service->releaseIfNoShow($prepagada))->toBeFalse();
});

test('el barrido ignora reservas fuera de la ventana de vigilancia', function () {
    $antigua = Booking::factory()
        ->for(Surfboard::factory())
        ->hourWindow(BusinessDateTime::parseInAppTimezone('2026-08-07 10:00:00'), 120)
        ->create();

    expect($this->service->noShowCandidates()->pluck('id')->all())->not->toContain($antigua->id);
});
