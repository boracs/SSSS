<?php

declare(strict_types=1);

use App\Models\Lesson;
use App\Models\LessonUser;
use App\Models\StaffAssignment;
use App\Models\User;
use App\Services\AvailabilityService;
use App\Support\BusinessDateTime;
use Illuminate\Support\Facades\DB;

/**
 * Helper propio: Pest registra las funciones de tests/Feature/Academy/* en global.
 * No reutilizar academyLesson() (ya existe en EnrollStudentDuplicateTest).
 *
 * @param  array<string, mixed>  $overrides
 */
function availabilityLesson(array $overrides = []): Lesson
{
    $start = BusinessDateTime::now()->addDays(10)->setTime(10, 0);

    return Lesson::query()->create(array_merge([
        'title' => 'Franja Availability',
        'starts_at' => $start,
        'ends_at' => $start->copy()->addMinutes(90),
        'type' => Lesson::TYPE_SURF,
        'modality' => Lesson::MODALITY_PARTICULAR,
        'level' => Lesson::LEVEL_INICIACION,
        'max_slots' => 1,
        'max_capacity' => 1,
        'price' => 80.00,
        'status' => Lesson::STATUS_SCHEDULED,
        'is_private' => true,
    ], $overrides));
}

/**
 * @return array<string, mixed>
 */
function availabilityEvaluate(
    $startsAt,
    $endsAt,
    int $partySize = 1,
    int $excludeLessonId = 0
): array {
    return DB::transaction(
        fn () => app(AvailabilityService::class)->evaluate($startsAt, $endsAt, $partySize, $excludeLessonId)
    );
}

function availabilityOccupy(Lesson $lesson, int $quantity = 1, string $status = LessonUser::STATUS_CONFIRMED): LessonUser
{
    $user = User::factory()->create(['role' => 'user']);

    return LessonUser::query()->create([
        'lesson_id' => $lesson->id,
        'user_id' => $user->id,
        'status' => $status,
        'quantity' => $quantity,
        'party_size' => $quantity,
        'payment_status' => LessonUser::PAYMENT_CONFIRMED,
    ]);
}

test('evaluate: agenda libre admite un particular (1 monitor)', function () {
    $start = BusinessDateTime::now()->addDays(10)->setTime(16, 0);
    $end = $start->copy()->addMinutes(90);

    $evaluation = availabilityEvaluate($start, $end, 1);

    expect($evaluation['allowed'])->toBeTrue()
        ->and($evaluation['request_monitors'])->toBe(1)
        ->and($evaluation['peak_monitors_used'])->toBe(0)
        ->and($evaluation['max_capacity'])->toBe(12)
        ->and($evaluation['conflicts'])->toBe([]);
});

test('dos particulares a la misma hora sí; la tercera no (pool de 2 monitores)', function () {
    $a = availabilityLesson(['title' => 'Particular A']);
    $b = availabilityLesson(['title' => 'Particular B']);
    availabilityOccupy($a);
    availabilityOccupy($b);

    $tercera = availabilityEvaluate($a->starts_at, $a->ends_at, 1);

    expect($tercera['allowed'])->toBeFalse()
        ->and($tercera['request_monitors'])->toBe(1)
        ->and($tercera['peak_monitors_used'])->toBe(2)
        ->and($tercera['occupied_lesson_ids'])->toContain($a->id, $b->id);

    $b->delete();

    $segunda = availabilityEvaluate($a->starts_at, $a->ends_at, 1);

    expect($segunda['allowed'])->toBeTrue()
        ->and($segunda['peak_monitors_used'])->toBe(1);
});

test('solape parcial ocupa el mismo pico que el solape total', function () {
    $ocupada = availabilityLesson();
    availabilityOccupy($ocupada);

    $solape = $ocupada->starts_at->copy()->addMinutes(45);
    $evaluation = availabilityEvaluate($solape, $solape->copy()->addMinutes(90), 1);

    expect($evaluation['allowed'])->toBeTrue()
        ->and($evaluation['peak_monitors_used'])->toBe(1)
        ->and($evaluation['conflicts'])->not->toBeEmpty()
        ->and($evaluation['occupied_lesson_ids'])->toContain($ocupada->id);
});

test('margen estándar 15 min: la franja que solo se toca no bloquea', function () {
    $ocupada = availabilityLesson();
    availabilityOccupy($ocupada);

    // Clase 10:00-11:30 + 15 min → ventana 09:45-11:45. Petición 12:00-13:30 → 11:45-13:45 (toque, no solape).
    $libre = $ocupada->ends_at->copy()->addMinutes(30);
    $evaluation = availabilityEvaluate($libre, $libre->copy()->addMinutes(90), 1);

    expect($evaluation['allowed'])->toBeTrue()
        ->and($evaluation['peak_monitors_used'])->toBe(0)
        ->and($evaluation['conflicts'])->toBe([]);
});

test('grupo de 7+ reserva 2 monitores y margen de 75 min', function () {
    $grupo = availabilityLesson([
        'title' => 'Grupal grande',
        'modality' => Lesson::MODALITY_GRUPAL,
        'is_private' => false,
        'max_slots' => 8,
        'max_capacity' => 8,
    ]);
    availabilityOccupy($grupo, 7);

    $mismaHora = availabilityEvaluate($grupo->starts_at, $grupo->ends_at, 1);

    expect($mismaHora['allowed'])->toBeFalse()
        ->and($mismaHora['peak_monitors_used'])->toBe(2);

    // Ventana del grupo: 10:00-11:30 ±75 → 08:45-12:45. Petición 12:00 sigue solapando; 13:00 ya no.
    $aunDentro = $grupo->starts_at->copy()->setTime(12, 0);
    expect(availabilityEvaluate($aunDentro, $aunDentro->copy()->addMinutes(90), 1)['allowed'])->toBeFalse();

    $fueraMargen = $grupo->starts_at->copy()->setTime(13, 0);
    expect(availabilityEvaluate($fueraMargen, $fueraMargen->copy()->addMinutes(90), 1)['allowed'])->toBeTrue()
        ->and(availabilityEvaluate($fueraMargen, $fueraMargen->copy()->addMinutes(90), 1)['peak_monitors_used'])->toBe(0);
});

test('effectivePartySizeForLesson: suelo 1 y grupos de 7+ reservan 2 aunque no estén llenos', function () {
    $service = app(AvailabilityService::class);

    expect($service->effectivePartySizeForLesson(0, 6))->toBe(1)
        ->and($service->effectivePartySizeForLesson(3, 6))->toBe(3)
        ->and($service->effectivePartySizeForLesson(0, 8))->toBe(7)
        ->and($service->effectivePartySizeForLesson(3, 8))->toBe(7)
        ->and($service->effectivePartySizeForLesson(8, 8))->toBe(8)
        ->and($service->monitorsRequiredForPartySize(6))->toBe(1)
        ->and($service->monitorsRequiredForPartySize(7))->toBe(2)
        ->and($service->marginsForPartySize(6))->toBe(15)
        ->and($service->marginsForPartySize(7))->toBe(75);
});

test('clase con monitor asignado y 0 inscritos ocupa 1 monitor', function () {
    $monitor = User::factory()->create(['role' => 'admin']);
    $vacia = availabilityLesson([
        'title' => 'Reservada al monitor',
        'modality' => Lesson::MODALITY_GRUPAL,
        'is_private' => false,
        'max_slots' => 6,
        'max_capacity' => 6,
    ]);
    StaffAssignment::query()->create([
        'lesson_id' => $vacia->id,
        'user_id' => $monitor->id,
        'role' => StaffAssignment::ROLE_MONITOR,
    ]);

    $evaluation = availabilityEvaluate($vacia->starts_at, $vacia->ends_at, 1);

    expect($evaluation['allowed'])->toBeTrue()
        ->and($evaluation['peak_monitors_used'])->toBe(1)
        ->and($evaluation['occupied_lesson_ids'])->toContain($vacia->id);
});

test('preview no escribe lessons y coincide con evaluate en transacción', function () {
    $ocupada = availabilityLesson();
    availabilityOccupy($ocupada);
    $antes = Lesson::query()->count();

    $preview = app(AvailabilityService::class)->preview($ocupada->starts_at, $ocupada->ends_at, 1);
    $evaluate = availabilityEvaluate($ocupada->starts_at, $ocupada->ends_at, 1);

    expect(Lesson::query()->count())->toBe($antes)
        ->and($preview['allowed'])->toBe($evaluate['allowed'])
        ->and($preview['peak_monitors_used'])->toBe($evaluate['peak_monitors_used'])
        ->and($preview['request_monitors'])->toBe($evaluate['request_monitors'])
        ->and($preview['occupied_lesson_ids'])->toBe($evaluate['occupied_lesson_ids']);
});

test('evaluate expone conflictos de buildIntervals (solape) sin llamar al método privado', function () {
    $ocupada = availabilityLesson(['title' => 'Conflicto visible']);
    availabilityOccupy($ocupada);

    $evaluation = availabilityEvaluate($ocupada->starts_at, $ocupada->ends_at, 1);

    expect($evaluation['conflicts'])->not->toBeEmpty()
        ->and($evaluation['conflicts'][0]['lesson_id'])->toBe($ocupada->id)
        ->and($evaluation['conflicts'][0]['title'])->toBe('Conflicto visible')
        ->and($evaluation['conflicts'][0]['monitors_required'])->toBe(1);
});

test('clase cancelada no cuenta en el pico', function () {
    $cancelada = availabilityLesson([
        'title' => 'Cancelada',
        'status' => Lesson::STATUS_CANCELLED,
    ]);
    availabilityOccupy($cancelada);

    $evaluation = availabilityEvaluate($cancelada->starts_at, $cancelada->ends_at, 1);

    expect($evaluation['allowed'])->toBeTrue()
        ->and($evaluation['peak_monitors_used'])->toBe(0)
        ->and($evaluation['conflicts'])->toBe([]);
});
