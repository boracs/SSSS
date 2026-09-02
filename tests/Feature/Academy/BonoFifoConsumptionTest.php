<?php

declare(strict_types=1);

use App\Actions\Academy\ApproveEnrollmentQuotaAction;
use App\Actions\Academy\EnrollStudentAction;
use App\Models\BonoConsumption;
use App\Models\Lesson;
use App\Models\LessonUser;
use App\Models\PackBono;
use App\Models\User;
use App\Models\UserBono;
use App\Services\BonoService;
use App\Support\BusinessDateTime;
use App\Support\LessonBonoCreditUnits;
use Illuminate\Support\Facades\DB;

function fifoLesson(array $overrides = []): Lesson
{
    $start = BusinessDateTime::now()->addDay()->setTime(11, 0);

    return Lesson::query()->create(array_merge([
        'title' => 'Grupal FIFO',
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

/**
 * @return array{0: User, 1: UserBono, 2: UserBono}
 */
function fifoVipWithTwoBonos(int $oldRemaining = 10, int $newRemaining = 10, int $packSize = 10): array
{
    $user = User::factory()->create(['role' => 'user', 'is_vip' => true]);

    $pack = PackBono::query()->create([
        'nombre' => 'Pack FIFO',
        'num_clases' => $packSize,
        'precio' => 200.00,
        'activo' => true,
    ]);

    $old = UserBono::query()->create([
        'user_id' => $user->id,
        'pack_id' => $pack->id,
        'clases_restantes' => $oldRemaining,
        'status' => UserBono::STATUS_CONFIRMED,
        'created_at' => now()->subDays(2),
        'updated_at' => now()->subDays(2),
    ]);

    $new = UserBono::query()->create([
        'user_id' => $user->id,
        'pack_id' => $pack->id,
        'clases_restantes' => $newRemaining,
        'status' => UserBono::STATUS_CONFIRMED,
        'created_at' => now()->subDay(),
        'updated_at' => now()->subDay(),
    ]);

    return [$user, $old, $new];
}

function fifoInUseBonoId(User $user): ?int
{
    $bonos = UserBono::query()->with('pack')->where('user_id', $user->id)->get();
    $states = app(BonoService::class)->resolveUsageStates($bonos);
    $inUse = collect($states)->filter(fn (array $s) => $s['usage_status'] === 'in_use')->keys();

    return $inUse->count() === 1 ? (int) $inUse->first() : null;
}

test('al inscribirse se consume el bono viejo (FIFO), el que la wallet marca En uso', function () {
    [$user, $old, $new] = fifoVipWithTwoBonos();
    $lesson = fifoLesson();

    expect(fifoInUseBonoId($user))->toBe((int) $old->id);

    $uc = LessonBonoCreditUnits::unitsForCharge(Lesson::MODALITY_GRUPAL, 1);
    $result = app(EnrollStudentAction::class)->execute($user->fresh(), $lesson);

    expect($result['ok'])->toBeTrue();

    $consumption = BonoConsumption::query()->where('user_id', $user->id)->sole();
    expect((int) $consumption->user_bono_id)->toBe((int) $old->id)
        ->and((int) $consumption->lesson_id)->toBe((int) $lesson->id);

    expect((int) $old->fresh()->clases_restantes)->toBe(10 - $uc)
        ->and((int) $new->fresh()->clases_restantes)->toBe(10);

    expect(fifoInUseBonoId($user->fresh()))->toBe((int) $old->id);
});

test('un bono viejo a medio gastar se elige antes que uno nuevo intacto', function () {
    [$user, $old, $new] = fifoVipWithTwoBonos(oldRemaining: 4, newRemaining: 10, packSize: 10);
    $lesson = fifoLesson();

    expect(fifoInUseBonoId($user))->toBe((int) $old->id);

    $uc = LessonBonoCreditUnits::unitsForCharge(Lesson::MODALITY_GRUPAL, 1);
    $result = app(EnrollStudentAction::class)->execute($user->fresh(), $lesson);

    expect($result['ok'])->toBeTrue();

    $consumption = BonoConsumption::query()->where('user_id', $user->id)->sole();
    expect((int) $consumption->user_bono_id)->toBe((int) $old->id)
        ->and((int) $old->fresh()->clases_restantes)->toBe(4 - $uc)
        ->and((int) $new->fresh()->clases_restantes)->toBe(10);
});

test('el reintento de inscripción no duplica el consumo FIFO', function () {
    [$user, $old] = fifoVipWithTwoBonos();
    $lesson = fifoLesson();
    $action = app(EnrollStudentAction::class);

    $primera = $action->execute($user->fresh(), $lesson);
    $segunda = $action->execute($user->fresh(), $lesson->fresh());

    expect($primera['ok'])->toBeTrue()
        ->and($segunda['ok'])->toBeFalse();

    expect(BonoConsumption::query()->where('user_id', $user->id)->count())->toBe(1)
        ->and((int) BonoConsumption::query()->where('user_id', $user->id)->value('user_bono_id'))
        ->toBe((int) $old->id);

    expect(LessonUser::query()
        ->where('lesson_id', $lesson->id)
        ->where('user_id', $user->id)
        ->whereIn('status', LessonUser::activeSeatStatuses())
        ->count())->toBe(1);
});

test('aprobar cupo extra también cobra el bono FIFO, no el más nuevo', function () {
    [$user, $old, $new] = fifoVipWithTwoBonos();
    $lesson = fifoLesson(['max_slots' => 12]);

    for ($i = 0; $i < 6; $i++) {
        $occupant = User::factory()->create(['role' => 'user']);
        LessonUser::query()->create([
            'lesson_id' => $lesson->id,
            'user_id' => $occupant->id,
            'party_size' => 1,
            'quantity' => 1,
            'credits_locked' => 0,
            'status' => LessonUser::STATUS_ENROLLED,
            'payment_status' => LessonUser::PAYMENT_CONFIRMED,
            'payment_method' => 'card',
        ]);
    }

    $enroll = app(EnrollStudentAction::class)->execute($user->fresh(), $lesson);
    expect($enroll['ok'])->toBeTrue()
        ->and($enroll['pending_admin'] ?? false)->toBeTrue()
        ->and(BonoConsumption::query()->where('user_id', $user->id)->count())->toBe(0);

    $enrollment = LessonUser::query()
        ->where('lesson_id', $lesson->id)
        ->where('user_id', $user->id)
        ->firstOrFail();

    expect($enrollment->status)->toBe(LessonUser::STATUS_PENDING_EXTRA_MONITOR);

    $approve = app(ApproveEnrollmentQuotaAction::class)->execute($enrollment);
    expect($approve['ok'])->toBeTrue();

    $consumption = BonoConsumption::query()->where('user_id', $user->id)->sole();
    expect((int) $consumption->user_bono_id)->toBe((int) $old->id)
        ->and((int) $old->fresh()->clases_restantes)->toBeLessThan(10)
        ->and((int) $new->fresh()->clases_restantes)->toBe(10);
});
