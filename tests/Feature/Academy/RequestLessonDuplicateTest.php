<?php

declare(strict_types=1);

use App\Actions\Academy\RequestLessonAction;
use App\Models\Lesson;
use App\Models\LessonUser;
use App\Models\User;
use App\Support\BusinessDateTime;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

function grupalAbierta(array $overrides = []): Lesson
{
    $start = BusinessDateTime::now()->addDay()->setTime(9, 0);

    return Lesson::query()->create(array_merge([
        'title' => 'Grupal abierta',
        'starts_at' => $start,
        'ends_at' => $start->copy()->addHours(2),
        'type' => Lesson::TYPE_SURF,
        'modality' => Lesson::MODALITY_GRUPAL,
        'level' => Lesson::LEVEL_INICIACION,
        'max_slots' => 6,
        'price' => 40.00,
        'status' => Lesson::STATUS_SCHEDULED,
    ], $overrides));
}

test('el doble clic del invitado con el mismo email deja una sola solicitud', function () {
    $lesson = grupalAbierta();
    $action = app(RequestLessonAction::class);

    $reservar = fn (string $email) => $action->execute(
        user: null,
        lesson: $lesson->fresh(),
        partySize: 1,
        requestExtraMonitor: false,
        ageBracket: null,
        participants: [['first_name' => 'Ane', 'last_name' => 'Zubiri']],
        guestEmail: $email,
        guestPhone: '600111222',
    );

    $primera = $reservar('ane@example.com');
    // Mismo email con otra capitalización: debe contar como el mismo invitado.
    $segunda = $reservar('Ane@Example.com');

    expect($primera['ok'])->toBeTrue()
        ->and($segunda['ok'])->toBeFalse()
        ->and($segunda['message'])->toContain('Ya hay una solicitud activa');

    expect(LessonUser::query()->where('lesson_id', $lesson->id)->count())->toBe(1);
});

test('el doble clic del socio logueado deja una sola solicitud', function () {
    $lesson = grupalAbierta();
    $user = User::factory()->create(['role' => 'user']);
    $action = app(RequestLessonAction::class);

    $reservar = fn () => $action->execute(
        user: $user->fresh(),
        lesson: $lesson->fresh(),
        partySize: 1,
        requestExtraMonitor: false,
        ageBracket: null,
        participants: [['first_name' => 'Mikel', 'last_name' => 'Agirre']],
    );

    $primera = $reservar();
    $segunda = $reservar();

    expect($primera['ok'])->toBeTrue()
        ->and($segunda['ok'])->toBeFalse()
        ->and($segunda['message'])->toContain('Ya tienes una solicitud');

    expect(LessonUser::query()->where('lesson_id', $lesson->id)->count())->toBe(1);
});

test('tras cancelar, el invitado puede volver a solicitar la misma clase', function () {
    $lesson = grupalAbierta();
    $action = app(RequestLessonAction::class);

    $reservar = fn () => $action->execute(
        user: null,
        lesson: $lesson->fresh(),
        partySize: 1,
        requestExtraMonitor: false,
        ageBracket: null,
        participants: [['first_name' => 'Ane', 'last_name' => 'Zubiri']],
        guestEmail: 'ane@example.com',
        guestPhone: '600111222',
    );

    $reservar();

    LessonUser::query()
        ->where('lesson_id', $lesson->id)
        ->update(['status' => LessonUser::STATUS_CANCELLED_FREE]);

    expect($reservar()['ok'])->toBeTrue()
        ->and(LessonUser::query()
            ->where('lesson_id', $lesson->id)
            ->whereIn('status', LessonUser::activeSeatStatuses())
            ->count())->toBe(1);
});

test('el índice único corta el duplicado de invitado a nivel de BD', function () {
    $lesson = grupalAbierta();

    $fila = [
        'lesson_id' => $lesson->id,
        'user_id' => null,
        'is_admin_guest' => false,
        'guest_first_name' => 'Ane',
        'guest_last_name' => 'Zubiri',
        'guest_email' => 'ane@example.com',
        'party_size' => 1,
        'quantity' => 1,
        'credits_locked' => 0,
        'status' => LessonUser::STATUS_PENDING,
        'payment_status' => LessonUser::PAYMENT_PENDING,
        'payment_method' => 'card',
        'created_at' => now(),
        'updated_at' => now(),
    ];

    DB::table('lesson_user')->insert($fila);

    expect(fn () => DB::table('lesson_user')->insert([...$fila, 'guest_email' => 'ANE@example.com']))
        ->toThrow(QueryException::class);
});

test('dos invitados distintos sí caben en la misma clase', function () {
    $lesson = grupalAbierta();
    $action = app(RequestLessonAction::class);

    $reservar = fn (string $email) => $action->execute(
        user: null,
        lesson: $lesson->fresh(),
        partySize: 1,
        requestExtraMonitor: false,
        ageBracket: null,
        participants: [['first_name' => 'Ane', 'last_name' => 'Zubiri']],
        guestEmail: $email,
        guestPhone: '600111222',
    );

    expect($reservar('ane@example.com')['ok'])->toBeTrue()
        ->and($reservar('jon@example.com')['ok'])->toBeTrue()
        ->and(LessonUser::query()->where('lesson_id', $lesson->id)->count())->toBe(2);
});
