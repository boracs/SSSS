<?php

declare(strict_types=1);

use App\Actions\Academy\EnrollStudentAction;
use App\Models\BonoConsumption;
use App\Models\Lesson;
use App\Models\LessonUser;
use App\Models\PackBono;
use App\Models\User;
use App\Models\UserBono;
use App\Support\BusinessDateTime;
use App\Support\LessonBonoCreditUnits;
use Illuminate\Support\Facades\Log;

/**
 * @return array{0: User, 1: UserBono}
 */
function l2VipBonoHolder(int $remaining = 10): array
{
    $user = User::factory()->create(['role' => 'user', 'is_vip' => true]);

    $pack = PackBono::query()->create([
        'nombre' => 'Pack L2 VIP destroy',
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

function l2VipLesson(array $overrides = []): Lesson
{
    $start = BusinessDateTime::now()->addDay()->setTime(11, 0);

    return Lesson::query()->create(array_merge([
        'title' => 'VIP L2',
        'starts_at' => $start,
        'ends_at' => $start->copy()->addMinutes(90),
        'type' => Lesson::TYPE_SURF,
        'modality' => 'vip',
        'level' => Lesson::LEVEL_INICIACION,
        'max_slots' => 4,
        'max_capacity' => 4,
        'price' => 0.0,
        'status' => Lesson::STATUS_SCHEDULED,
    ], $overrides));
}

test('destroy VIP con alumno de bono devuelve los créditos persistidos y flash veraz', function () {
    [$user, $bono] = l2VipBonoHolder(10);
    $admin = User::factory()->create(['role' => 'admin']);
    $lesson = l2VipLesson();

    $enroll = app(EnrollStudentAction::class)->execute($user->fresh(), $lesson);
    expect($enroll['ok'])->toBeTrue();

    $charged = (int) BonoConsumption::query()->where('user_id', $user->id)->value('units_consumed');
    expect($charged)->toBe(LessonBonoCreditUnits::unitsForCharge('vip', 1))
        ->and((int) $bono->fresh()->clases_restantes)->toBe(10 - $charged);

    Log::spy();

    $this->actingAs($admin)
        ->from('/admin/class-manager')
        ->delete(route('admin.vip-manager.lessons.destroy', $lesson))
        ->assertRedirect('/admin/class-manager')
        ->assertSessionHas('success', "Clase VIP eliminada. {$charged} créditos devueltos.");

    expect((int) $bono->fresh()->clases_restantes)->toBe(10)
        ->and(Lesson::query()->whereKey($lesson->id)->exists())->toBeFalse()
        ->and(BonoConsumption::query()->where('user_id', $user->id)->exists())->toBeFalse();

    Log::shouldHaveReceived('info')->withArgs(function (string $message, array $context) use ($user, $charged): bool {
        return str_contains($message, 'créditos devueltos')
            && ($context['refunds'][0]['user_id'] ?? null) === $user->id
            && ($context['refunds'][0]['units'] ?? null) === $charged;
    });
});

test('destroy VIP sin alumnos no toca saldos y el flash dice la verdad', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $holder = l2VipBonoHolder(7);
    $lesson = l2VipLesson();

    $this->actingAs($admin)
        ->from('/admin/class-manager')
        ->delete(route('admin.vip-manager.lessons.destroy', $lesson))
        ->assertRedirect('/admin/class-manager')
        ->assertSessionHas('success', 'Clase VIP eliminada. Sin alumnos inscritos.');

    expect((int) $holder[1]->fresh()->clases_restantes)->toBe(7)
        ->and(Lesson::query()->whereKey($lesson->id)->exists())->toBeFalse();
});

test('destroy VIP de alumno con tarjeta no reembolsa créditos de bono', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    [$other, $bono] = l2VipBonoHolder(6);
    $lesson = l2VipLesson();

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

    $this->actingAs($admin)
        ->from('/admin/class-manager')
        ->delete(route('admin.vip-manager.lessons.destroy', $lesson))
        ->assertRedirect('/admin/class-manager')
        ->assertSessionHas('success', 'Clase VIP eliminada. 0 créditos devueltos.');

    expect((int) $bono->fresh()->clases_restantes)->toBe(6)
        ->and($other->fresh()->exists())->toBeTrue();
});

test('crear clase VIP escribe las unidades reales en solitario, no VIP_CREDIT_COST=1', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $solo = LessonBonoCreditUnits::unitsForCharge('vip', 1);
    $date = BusinessDateTime::now()->addDays(3)->format('Y-m-d');

    $this->actingAs($admin)
        ->from('/admin/class-manager')
        ->post(route('admin.vip-manager.lessons.store'), [
            'date' => $date,
            'time' => '10:00',
            'level' => 'iniciacion',
            'max_capacity' => 4,
            'force_create' => true,
        ])
        ->assertRedirect('/admin/class-manager')
        ->assertSessionHas('success', "Clase VIP creada correctamente (en solitario consume {$solo} créditos).");

    $lesson = Lesson::query()->where('modality', 'vip')->whereDate('starts_at', $date)->firstOrFail();
    expect($lesson->internal_notes)->toBe('VIP unidades en solitario: '.$solo)
        ->and($lesson->internal_notes)->not->toContain('VIP_CREDIT_COST');
});
