<?php

declare(strict_types=1);

use App\Models\DatafonoPayment;
use App\Models\Lesson;
use App\Models\LessonUser;
use App\Models\PaymentTerminal;
use App\Models\User;
use App\Services\Payments\DatafonoPaymentReconciliationService;
use App\Support\BusinessDateTime;
use Illuminate\Validation\ValidationException;

beforeEach(function () {
    $this->terminal = PaymentTerminal::query()->create([
        'codigo' => 'tpv_clase_'.uniqid(),
        'nombre' => 'TPV walk-in clase',
        'activo' => true,
        'emite_ticketbai_propio' => true,
    ]);

    $this->service = app(DatafonoPaymentReconciliationService::class);
});

function pendingCobroClase(PaymentTerminal $terminal, int $amountCents): DatafonoPayment
{
    return DatafonoPayment::query()->create([
        'payment_terminal_id' => $terminal->id,
        'amount_cents' => $amountCents,
        'paid_at' => BusinessDateTime::now(),
        'status' => DatafonoPayment::STATUS_PENDING_REVIEW,
        'source' => DatafonoPayment::SOURCE_MANUAL_CASH,
    ]);
}

function makeScheduledLesson(array $overrides = []): Lesson
{
    $start = BusinessDateTime::now()->addDay()->setTime(10, 0);
    $end = $start->copy()->addHours(2);

    return Lesson::query()->create(array_merge([
        'title' => 'Grupal iniciación',
        'starts_at' => $start,
        'ends_at' => $end,
        'type' => Lesson::TYPE_SURF,
        'modality' => Lesson::MODALITY_GRUPAL,
        'level' => Lesson::LEVEL_INICIACION,
        'max_slots' => 6,
        'price' => 40.00,
        'status' => Lesson::STATUS_SCHEDULED,
    ], $overrides));
}

test('reconcile clase walk-in crea LessonUser confirmado y asigna datáfono', function () {
    $user = User::factory()->create(['role' => 'user']);
    $lesson = makeScheduledLesson();
    $payment = pendingCobroClase($this->terminal, 4000);

    $result = $this->service->reconcile($payment, $user, [
        'category' => 'clase',
        'lesson_id' => $lesson->id,
        'reviewed_by' => $user->id,
    ]);

    expect($result->status)->toBe(DatafonoPayment::STATUS_ASSIGNED)
        ->and($result->payable_type)->toBe(LessonUser::class)
        ->and($result->assigned_user_id)->toBe($user->id);

    $enrollment = LessonUser::query()->findOrFail($result->payable_id);
    expect($enrollment->user_id)->toBe($user->id)
        ->and((int) $enrollment->lesson_id)->toBe($lesson->id)
        ->and($enrollment->status)->toBe(LessonUser::STATUS_CONFIRMED)
        ->and($enrollment->payment_status)->toBe(LessonUser::PAYMENT_CONFIRMED)
        ->and($enrollment->payment_method)->toBe('datafono');
});

test('reconcile clase walk-in sin lesson_id ni payable_id lanza ValidationException', function () {
    $user = User::factory()->create(['role' => 'user']);
    $payment = pendingCobroClase($this->terminal, 4000);

    expect(fn () => $this->service->reconcile($payment, $user, [
        'category' => 'clase',
        'reviewed_by' => $user->id,
    ]))->toThrow(ValidationException::class);
});

test('catalogUpcomingLessons incluye la clase programada', function () {
    $lesson = makeScheduledLesson(['title' => 'Skate tarde', 'type' => Lesson::TYPE_SKATE]);

    $catalog = $this->service->catalogUpcomingLessons();
    $ids = collect($catalog)->pluck('id')->all();

    expect($ids)->toContain($lesson->id);
});

test('createWalkInLesson crea particular y la devuelve en formato catálogo', function () {
    $starts = BusinessDateTime::now()->addDays(2)->setTime(11, 0)->second(0);

    $item = $this->service->createWalkInLesson([
        'starts_at' => $starts->format('Y-m-d\TH:i'),
        'duration_minutes' => 90,
        'type' => Lesson::TYPE_SURF,
        'modality' => Lesson::MODALITY_PARTICULAR,
        'level' => Lesson::LEVEL_INICIACION,
        'price' => 55,
    ]);

    expect($item['id'])->toBeInt()
        ->and($item['modality'])->toBe(Lesson::MODALITY_PARTICULAR)
        ->and($item['precio_cents'])->toBe(5500)
        ->and($item['max_slots'])->toBe(1);

    $lesson = Lesson::query()->findOrFail($item['id']);
    expect($lesson->status)->toBe(Lesson::STATUS_SCHEDULED)
        ->and((bool) $lesson->is_private)->toBeTrue()
        ->and((float) $lesson->price)->toBe(55.0);
});

test('createWalkInLesson rechaza modalidad semanal', function () {
    $starts = BusinessDateTime::now()->addDays(2)->setTime(11, 0)->second(0);

    expect(fn () => $this->service->createWalkInLesson([
        'starts_at' => $starts->format('Y-m-d\TH:i'),
        'modality' => Lesson::MODALITY_SEMANAL,
        'price' => 35,
    ]))->toThrow(ValidationException::class);
});
