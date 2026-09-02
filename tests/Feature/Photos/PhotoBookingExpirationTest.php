<?php

declare(strict_types=1);

use App\Actions\Photos\ConfirmPhotoBookingPaymentAction;
use App\Actions\Photos\RejectPhotoBookingPaymentAction;
use App\Models\PhotoSession;
use App\Models\PhotoSessionBooking;
use App\Models\User;
use App\Services\Photos\PhotoBookingService;
use App\Support\BusinessDateTime;
use Illuminate\Validation\ValidationException;

beforeEach(function () {
    $this->session = PhotoSession::query()->create([
        'nombre' => 'Sesión caducidad',
        'precio_cents' => 1500,
        'duracion_minutos' => 60,
        'capacidad_maxima' => null,
        'activo' => true,
    ]);
    $this->service = app(PhotoBookingService::class);
});

test('createBooking con expires_in_minutes deja expires_at en el futuro', function () {
    $booking = $this->service->createBooking([
        'photo_session_id' => $this->session->id,
        'fecha_inicio' => BusinessDateTime::now()->addDay()->setTime(10, 0)->toDateTimeString(),
        'party_size' => 1,
        'is_admin_guest' => true,
        'guest_first_name' => 'Ada',
        'guest_email' => 'ada@example.test',
        'expires_in_minutes' => 30,
    ]);

    expect($booking->expires_at)->not->toBeNull()
        ->and($booking->expires_at->isFuture())->toBeTrue();
});

test('createBooking sin expires_in_minutes (admin/datáfono) deja expires_at null', function () {
    $booking = $this->service->createBooking([
        'photo_session_id' => $this->session->id,
        'fecha_inicio' => BusinessDateTime::now()->addDay()->setTime(11, 0)->toDateTimeString(),
        'party_size' => 1,
        'is_admin_guest' => true,
        'guest_first_name' => 'Bob',
        'guest_email' => 'bob@example.test',
    ]);

    expect($booking->expires_at)->toBeNull();
});

test('cancelExpiredPending cancela pendientes vencidos', function () {
    $expired = $this->service->createBooking([
        'photo_session_id' => $this->session->id,
        'fecha_inicio' => BusinessDateTime::now()->addDay()->setTime(12, 0)->toDateTimeString(),
        'party_size' => 1,
        'is_admin_guest' => true,
        'guest_first_name' => 'Caduca',
        'guest_email' => 'caduca@example.test',
        'expires_in_minutes' => 30,
    ]);
    $expired->update(['expires_at' => BusinessDateTime::now()->subMinute()]);

    $alive = $this->service->createBooking([
        'photo_session_id' => $this->session->id,
        'fecha_inicio' => BusinessDateTime::now()->addDay()->setTime(13, 0)->toDateTimeString(),
        'party_size' => 1,
        'is_admin_guest' => true,
        'guest_first_name' => 'Viva',
        'guest_email' => 'viva@example.test',
        'expires_in_minutes' => 45,
    ]);

    $cancelled = $this->service->cancelExpiredPending();

    expect($cancelled->pluck('id')->all())->toContain($expired->id)
        ->and($expired->fresh()->status)->toBe(PhotoSessionBooking::STATUS_CANCELLED)
        ->and($alive->fresh()->status)->toBe(PhotoSessionBooking::STATUS_PENDING);
});

test('webhook con pago confirma una reserva cancelada por caducidad', function () {
    $booking = $this->service->createBooking([
        'photo_session_id' => $this->session->id,
        'fecha_inicio' => BusinessDateTime::now()->addDay()->setTime(15, 0)->toDateTimeString(),
        'party_size' => 1,
        'is_admin_guest' => true,
        'guest_first_name' => 'Pago',
        'guest_email' => 'pago@example.test',
        'expires_in_minutes' => 30,
    ]);
    $booking->update([
        'expires_at' => BusinessDateTime::now()->subMinute(),
        'status' => PhotoSessionBooking::STATUS_CANCELLED,
        'admin_notes' => 'Caducada: pago no completado',
    ]);

    $out = app(ConfirmPhotoBookingPaymentAction::class)->execute($booking->fresh(), 'card');

    expect($out['ok'])->toBeTrue()
        ->and($booking->fresh()->status)->toBe(PhotoSessionBooking::STATUS_CONFIRMED)
        ->and($booking->fresh()->payment_status)->toBe(PhotoSessionBooking::PAYMENT_CONFIRMED)
        ->and((string) $booking->fresh()->admin_notes)->toContain('Resucitada');
});

test('con APP_TIMEZONE=UTC un expires_at ya vencido en Madrid se detecta como caducado', function () {
    $prevConfig = (string) config('app.timezone');
    $prevPhp = date_default_timezone_get();
    config(['app.timezone' => 'UTC']);
    date_default_timezone_set('UTC');

    try {
        $booking = $this->service->createBooking([
            'photo_session_id' => $this->session->id,
            'fecha_inicio' => BusinessDateTime::now()->addDay()->setTime(16, 0)->toDateTimeString(),
            'party_size' => 1,
            'is_admin_guest' => true,
            'guest_first_name' => 'Utc',
            'guest_email' => 'utc@example.test',
            'expires_in_minutes' => 30,
        ]);
        $booking->update(['expires_at' => BusinessDateTime::now()->subMinute()]);

        $fresh = $booking->fresh();
        expect($fresh->isCheckoutExpired())->toBeTrue()
            ->and($fresh->expires_at->isPast())->toBeTrue();
    } finally {
        config(['app.timezone' => $prevConfig]);
        date_default_timezone_set($prevPhp);
    }
});

test('confirm sobre rejected lanza ValidationException', function () {
    $user = User::factory()->create(['role' => 'user']);
    $booking = $this->service->createBooking([
        'photo_session_id' => $this->session->id,
        'fecha_inicio' => BusinessDateTime::now()->addDay()->setTime(14, 0)->toDateTimeString(),
        'party_size' => 1,
        'user_id' => $user->id,
        'guest_email' => $user->email,
    ]);

    app(RejectPhotoBookingPaymentAction::class)->execute($booking, 'No válido');

    expect(fn () => app(ConfirmPhotoBookingPaymentAction::class)->execute($booking->fresh(), 'card'))
        ->toThrow(ValidationException::class);

    expect($booking->fresh()->status)->toBe(PhotoSessionBooking::STATUS_REJECTED)
        ->and($booking->fresh()->payment_status)->toBe(PhotoSessionBooking::PAYMENT_REJECTED);
});
