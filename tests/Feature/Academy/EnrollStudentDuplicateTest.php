<?php

declare(strict_types=1);

use App\Actions\Academy\EnrollStudentAction;
use App\Models\Lesson;
use App\Models\LessonUser;
use App\Models\PackBono;
use App\Models\User;
use App\Models\UserBono;
use App\Support\BusinessDateTime;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

function academyLesson(array $overrides = []): Lesson
{
    $start = BusinessDateTime::now()->addDay()->setTime(10, 0);

    return Lesson::query()->create(array_merge([
        'title' => 'Grupal iniciación',
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

function vipConBono(int $creditos = 10): User
{
    $user = User::factory()->create(['role' => 'user', 'is_vip' => true]);

    $pack = PackBono::query()->create([
        'nombre' => 'Pack 10 clases',
        'num_clases' => 10,
        'precio' => 200.00,
        'activo' => true,
    ]);

    UserBono::query()->create([
        'user_id' => $user->id,
        'pack_id' => $pack->id,
        'clases_restantes' => $creditos,
        'status' => UserBono::STATUS_CONFIRMED,
    ]);

    return $user;
}

test('el doble clic del VIP deja una sola inscripción y consume un solo crédito', function () {
    $user = vipConBono(10);
    $lesson = academyLesson();

    $action = app(EnrollStudentAction::class);

    $primera = $action->execute($user->fresh(), $lesson);
    $saldoTrasPrimera = (int) UserBono::query()->where('user_id', $user->id)->firstOrFail()->clases_restantes;

    $segunda = $action->execute($user->fresh(), $lesson->fresh());

    expect($primera['ok'])->toBeTrue()
        ->and($segunda['ok'])->toBeFalse()
        ->and($segunda['message'])->toContain('Ya estás inscrito');

    expect(LessonUser::query()
        ->where('lesson_id', $lesson->id)
        ->where('user_id', $user->id)
        ->count())->toBe(1);

    // El segundo clic no vuelve a cargar créditos.
    expect($saldoTrasPrimera)->toBeLessThan(10)
        ->and((int) UserBono::query()->where('user_id', $user->id)->firstOrFail()->clases_restantes)
        ->toBe($saldoTrasPrimera);
});

test('el índice único corta el duplicado aunque el código no lo vea', function () {
    $user = vipConBono();
    $lesson = academyLesson();

    $fila = [
        'lesson_id' => $lesson->id,
        'user_id' => $user->id,
        'party_size' => 1,
        'quantity' => 1,
        'credits_locked' => 0,
        'status' => LessonUser::STATUS_ENROLLED,
        'payment_status' => LessonUser::PAYMENT_CONFIRMED,
        'payment_method' => 'bono_vip',
        'created_at' => now(),
        'updated_at' => now(),
    ];

    DB::table('lesson_user')->insert($fila);

    expect(fn () => DB::table('lesson_user')->insert($fila))
        ->toThrow(QueryException::class);
});

test('tras cancelar, el mismo alumno puede volver a inscribirse', function () {
    $user = vipConBono(10);
    $lesson = academyLesson();

    $action = app(EnrollStudentAction::class);
    $action->execute($user->fresh(), $lesson);

    LessonUser::query()
        ->where('lesson_id', $lesson->id)
        ->where('user_id', $user->id)
        ->update(['status' => LessonUser::STATUS_CANCELLED]);

    $reintento = $action->execute($user->fresh(), $lesson->fresh());

    expect($reintento['ok'])->toBeTrue()
        ->and(LessonUser::query()
            ->where('lesson_id', $lesson->id)
            ->where('user_id', $user->id)
            ->whereIn('status', LessonUser::activeSeatStatuses())
            ->count())->toBe(1);
});

test('el mostrador puede apuntar varios invitados con el mismo email', function () {
    $lesson = academyLesson();

    $fila = fn (string $nombre): array => [
        'lesson_id' => $lesson->id,
        'user_id' => null,
        'is_admin_guest' => true,
        'guest_first_name' => $nombre,
        'guest_last_name' => 'Etxeberria',
        'guest_email' => 'familia@example.com',
        'party_size' => 1,
        'quantity' => 1,
        'credits_locked' => 0,
        'status' => LessonUser::STATUS_ENROLLED,
        'payment_status' => LessonUser::PAYMENT_CONFIRMED,
        'payment_method' => 'datafono',
        'created_at' => now(),
        'updated_at' => now(),
    ];

    DB::table('lesson_user')->insert($fila('Ane'));
    DB::table('lesson_user')->insert($fila('Jon'));

    expect(DB::table('lesson_user')->where('lesson_id', $lesson->id)->count())->toBe(2);
});
