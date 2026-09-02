<?php

declare(strict_types=1);

use App\Models\Lesson;
use App\Models\LessonUser;
use App\Models\User;
use App\Support\BusinessDateTime;

/**
 * `confirmSurfTrip` devuelve el crédito cuando el alumno rechaza un cambio de sede
 * decidido por el club. Sin guardas era una puerta trasera de reembolso: valía para
 * cualquier clase propia, incluso ya terminada, sin pasar por la política de
 * cancelación. Aquí se fija qué sigue permitido y qué no.
 */
function surfTripLesson(array $overrides = []): Lesson
{
    $start = BusinessDateTime::now()->addDay()->setTime(9, 0);

    return Lesson::query()->create(array_merge([
        'title' => 'Grupal con cambio de playa',
        'starts_at' => $start,
        'ends_at' => $start->copy()->addHours(2),
        'type' => Lesson::TYPE_SURF,
        'modality' => Lesson::MODALITY_GRUPAL,
        'level' => Lesson::LEVEL_INICIACION,
        'max_slots' => 6,
        'price' => 40.00,
        'status' => Lesson::STATUS_SCHEDULED,
        'is_surf_trip' => true,
    ], $overrides));
}

function surfTripEnrollment(Lesson $lesson, User $user, array $overrides = []): LessonUser
{
    return LessonUser::query()->create(array_merge([
        'lesson_id' => $lesson->id,
        'user_id' => $user->id,
        'party_size' => 1,
        'quantity' => 1,
        'credits_locked' => 0,
        'status' => LessonUser::STATUS_ENROLLED,
        'payment_status' => LessonUser::PAYMENT_CONFIRMED,
        'payment_method' => 'bono_vip',
    ], $overrides));
}

test('rechazar el cambio de sede sigue devolviendo el crédito aunque queden menos de 4 h', function () {
    $user = User::factory()->create(['role' => 'user']);
    // Dentro del corte de cancelación estándar: el cambio lo decidió el club, no el alumno.
    $lesson = surfTripLesson(['starts_at' => BusinessDateTime::now()->addHours(2)]);
    $lesson->update(['ends_at' => BusinessDateTime::now()->addHours(4)]);
    $enrollment = surfTripEnrollment($lesson, $user);

    $this->actingAs($user)
        ->post(route('academy.lessons.confirm-surf-trip', $lesson->id), ['confirm' => false])
        ->assertSessionHas('success');

    expect($enrollment->fresh()->status)->toBe(LessonUser::STATUS_REFUNDED);
});

test('no se puede reclamar reembolso de una clase que no es surf-trip', function () {
    $user = User::factory()->create(['role' => 'user']);
    $lesson = surfTripLesson(['is_surf_trip' => false]);
    $enrollment = surfTripEnrollment($lesson, $user);

    $this->actingAs($user)
        ->post(route('academy.lessons.confirm-surf-trip', $lesson->id), ['confirm' => false])
        ->assertSessionHas('error');

    expect($enrollment->fresh()->status)->toBe(LessonUser::STATUS_ENROLLED)
        ->and($enrollment->fresh()->surf_trip_confirmed)->toBeNull(); // la respuesta no se registró
});

test('no se puede reclamar reembolso con la clase ya empezada', function () {
    $user = User::factory()->create(['role' => 'user']);
    $lesson = surfTripLesson();
    $lesson->forceFill([
        'starts_at' => BusinessDateTime::now()->subHours(3),
        'ends_at' => BusinessDateTime::now()->subHour(),
    ])->save();
    $enrollment = surfTripEnrollment($lesson, $user);

    $this->actingAs($user)
        ->post(route('academy.lessons.confirm-surf-trip', $lesson->id), ['confirm' => false])
        ->assertSessionHas('error');

    expect($enrollment->fresh()->status)->toBe(LessonUser::STATUS_ENROLLED);
});

test('una plaza ya reembolsada no admite un segundo reembolso', function () {
    $user = User::factory()->create(['role' => 'user']);
    $lesson = surfTripLesson();
    $enrollment = surfTripEnrollment($lesson, $user, [
        'status' => LessonUser::STATUS_REFUNDED,
        'surf_trip_confirmed' => false,
    ]);

    $this->actingAs($user)
        ->post(route('academy.lessons.confirm-surf-trip', $lesson->id), ['confirm' => false])
        ->assertSessionHas('error');

    expect($enrollment->fresh()->status)->toBe(LessonUser::STATUS_REFUNDED);
});

test('confirmar la asistencia al cambio de sede no toca el saldo', function () {
    $user = User::factory()->create(['role' => 'user']);
    $lesson = surfTripLesson();
    $enrollment = surfTripEnrollment($lesson, $user);

    $this->actingAs($user)
        ->post(route('academy.lessons.confirm-surf-trip', $lesson->id), ['confirm' => true])
        ->assertSessionHas('success');

    // Ojo: `surf_trip_confirmed` no tiene cast a boolean en el modelo (devuelve 1/0).
    expect((bool) $enrollment->fresh()->surf_trip_confirmed)->toBeTrue()
        ->and($enrollment->fresh()->status)->toBe(LessonUser::STATUS_ENROLLED);
});
