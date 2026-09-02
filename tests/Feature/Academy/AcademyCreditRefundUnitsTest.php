<?php

declare(strict_types=1);

use App\Actions\Academy\EnrollStudentAction;
use App\Models\BonoConsumption;
use App\Models\Lesson;
use App\Models\LessonUser;
use App\Models\PackBono;
use App\Models\User;
use App\Models\UserBono;
use App\Services\CreditEngineService;
use App\Support\BusinessDateTime;
use App\Support\LessonBonoCreditUnits;

function l2GrupalLesson(array $overrides = []): Lesson
{
    $start = BusinessDateTime::now()->addDay()->setTime(10, 0);

    return Lesson::query()->create(array_merge([
        'title' => 'Grupal L2',
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
 * @return array{0: User, 1: UserBono}
 */
function l2VipWithBono(int $remaining = 10): array
{
    $user = User::factory()->create(['role' => 'user', 'is_vip' => true]);

    $pack = PackBono::query()->create([
        'nombre' => 'Pack L2',
        'num_clases' => 10,
        'precio' => 200.00,
        'activo' => true,
    ]);

    $bono = UserBono::query()->create([
        'user_id' => $user->id,
        'pack_id' => $pack->id,
        'clases_restantes' => $remaining,
        'status' => UserBono::STATUS_CONFIRMED,
    ]);

    return [$user, $bono];
}

function l2OccupySeat(Lesson $lesson): void
{
    LessonUser::query()->create([
        'lesson_id' => $lesson->id,
        'user_id' => User::factory()->create(['role' => 'user'])->id,
        'party_size' => 1,
        'quantity' => 1,
        'credits_locked' => 0,
        'status' => LessonUser::STATUS_ENROLLED,
        'payment_status' => LessonUser::PAYMENT_CONFIRMED,
        'payment_method' => 'card',
    ]);
}

test('el 1.er ocupante grupal cobra 2 y el refund devuelve 2 (saldo exacto)', function () {
    [$user, $bono] = l2VipWithBono(10);
    $lesson = l2GrupalLesson();

    $result = app(EnrollStudentAction::class)->execute($user->fresh(), $lesson);
    expect($result['ok'])->toBeTrue();

    $consumption = BonoConsumption::query()->where('user_id', $user->id)->sole();
    expect((int) $consumption->units_consumed)->toBe(2)
        ->and((int) $bono->fresh()->clases_restantes)->toBe(8);

    $enrollment = LessonUser::query()
        ->where('lesson_id', $lesson->id)
        ->where('user_id', $user->id)
        ->firstOrFail();

    $units = app(CreditEngineService::class)->refundCredits($enrollment, 'Test L2 primer ocupante');

    expect($units)->toBe(2)
        ->and((int) $bono->fresh()->clases_restantes)->toBe(10)
        ->and($enrollment->fresh()->status)->toBe(LessonUser::STATUS_REFUNDED);
});

test('el 2.º ocupante grupal cobra 1 y el refund devuelve 1 (sin crédito regalado)', function () {
    [$user, $bono] = l2VipWithBono(10);
    $lesson = l2GrupalLesson();
    l2OccupySeat($lesson);

    $result = app(EnrollStudentAction::class)->execute($user->fresh(), $lesson);
    expect($result['ok'])->toBeTrue();

    $consumption = BonoConsumption::query()->where('user_id', $user->id)->sole();
    expect((int) $consumption->units_consumed)->toBe(1)
        ->and((int) $bono->fresh()->clases_restantes)->toBe(9);

    $enrollment = LessonUser::query()
        ->where('lesson_id', $lesson->id)
        ->where('user_id', $user->id)
        ->firstOrFail();

    $units = app(CreditEngineService::class)->refundCredits($enrollment, 'Test L2 segundo ocupante');

    expect($units)->toBe(1)
        ->and((int) $bono->fresh()->clases_restantes)->toBe(10);
});

test('sin units_consumed el refund usa el cálculo legacy (quantity), no uno nuevo', function () {
    [$user, $bono] = l2VipWithBono(10);
    $lesson = l2GrupalLesson();
    l2OccupySeat($lesson);

    $enrollment = LessonUser::query()->create([
        'lesson_id' => $lesson->id,
        'user_id' => $user->id,
        'party_size' => 1,
        'quantity' => 1,
        'credits_locked' => 0,
        'status' => LessonUser::STATUS_ENROLLED,
        'payment_status' => LessonUser::PAYMENT_CONFIRMED,
        'payment_method' => 'bono_vip',
    ]);

    BonoConsumption::query()->create([
        'user_bono_id' => $bono->id,
        'user_id' => $user->id,
        'lesson_id' => $lesson->id,
        'remaining_after' => 9,
        'units_consumed' => null,
        'consumed_at' => BusinessDateTime::now(),
    ]);
    $bono->update(['clases_restantes' => 9]);

    $legacy = LessonBonoCreditUnits::unitsForCharge(Lesson::MODALITY_GRUPAL, 1);
    expect($legacy)->toBe(2);

    $units = app(CreditEngineService::class)->refundCredits($enrollment, 'Test L2 fallback legacy');

    expect($units)->toBe($legacy)
        ->and((int) $bono->fresh()->clases_restantes)->toBe(11);
});

test('LessonBonoCreditUnits no cambia la fórmula de cobro', function () {
    expect(LessonBonoCreditUnits::unitsForCharge(Lesson::MODALITY_GRUPAL, 1))->toBe(2)
        ->and(LessonBonoCreditUnits::unitsForCharge(Lesson::MODALITY_GRUPAL, 2))->toBe(1)
        ->and(LessonBonoCreditUnits::unitsForCharge(Lesson::MODALITY_PARTICULAR, 1))->toBe(2)
        ->and(LessonBonoCreditUnits::unitsForCharge('vip', 1))->toBe(2)
        ->and(LessonBonoCreditUnits::unitsForCharge('vip', 2))->toBe(1);
});
