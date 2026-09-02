<?php

declare(strict_types=1);

use App\Http\Controllers\Academy\LessonController;
use App\Models\Lesson;
use App\Support\BusinessDateTime;
use Illuminate\Support\Facades\DB;

/**
 * @return list<array<string, mixed>>
 */
function availabilityQueryLog(): array
{
    return DB::getQueryLog();
}

function countQueriesTouching(string $table): int
{
    return collect(availabilityQueryLog())
        ->filter(function (array $query) use ($table): bool {
            $sql = strtolower($query['query']);

            return str_contains($sql, '`'.$table.'`') || str_contains($sql, '"'.$table.'"');
        })
        ->count();
}

test('N7: disponibilidad de particulares responde el mismo JSON y no llama preview por slot', function () {
    $source = file_get_contents((new ReflectionClass(LessonController::class))->getFileName());
    $method = (new ReflectionClass(LessonController::class))->getMethod('privateAvailability');
    $body = implode('', array_slice(
        file($method->getFileName()),
        $method->getStartLine() - 1,
        $method->getEndLine() - $method->getStartLine() + 1,
    ));

    expect($body)->toContain('previewManyWindows')
        ->and($body)->not->toContain('->preview(')
        ->and($source)->toContain('previewManyWindows');

    $day = BusinessDateTime::now()->addDays(14)->startOfDay();
    $date = $day->toDateString();

    DB::flushQueryLog();
    DB::enableQueryLog();

    $empty = $this->getJson(route('academy.private.availability', [
        'date' => $date,
        'duration_minutes' => 90,
    ]))->assertOk();

    $emptyQueries = count(availabilityQueryLog());
    $emptyLessonQueries = countQueriesTouching('lessons');
    $emptySlots = $empty->json('slots');

    expect($empty->json('date'))->toBe($date)
        ->and($empty->json('duration_minutes'))->toBe(90)
        ->and($emptySlots)->not->toBeEmpty()
        ->and($emptySlots[0])->toHaveKeys(['start', 'end']);

    $starts = collect($emptySlots)->pluck('start');
    expect($starts)->toContain('10:00')
        ->and($starts)->toContain('12:00');

    $slotStart = $day->copy()->setTime(10, 0);
    Lesson::query()->create([
        'title' => 'Particular 1',
        'starts_at' => $slotStart,
        'ends_at' => $slotStart->copy()->addMinutes(90),
        'type' => Lesson::TYPE_SURF,
        'modality' => Lesson::MODALITY_PARTICULAR,
        'level' => Lesson::LEVEL_INICIACION,
        'max_slots' => 1,
        'status' => Lesson::STATUS_SCHEDULED,
        'is_private' => true,
        'price' => 80,
    ]);
    Lesson::query()->create([
        'title' => 'Particular 2',
        'starts_at' => $slotStart,
        'ends_at' => $slotStart->copy()->addMinutes(90),
        'type' => Lesson::TYPE_SURF,
        'modality' => Lesson::MODALITY_PARTICULAR,
        'level' => Lesson::LEVEL_INICIACION,
        'max_slots' => 1,
        'status' => Lesson::STATUS_SCHEDULED,
        'is_private' => true,
        'price' => 80,
    ]);

    DB::flushQueryLog();
    DB::enableQueryLog();

    $full = $this->getJson(route('academy.private.availability', [
        'date' => $date,
        'duration_minutes' => 90,
    ]))->assertOk();

    $fullQueries = count(availabilityQueryLog());
    $fullLessonQueries = countQueriesTouching('lessons');
    $fullStarts = collect($full->json('slots'))->pluck('start');

    expect($full->json())->toHaveKeys(['date', 'duration_minutes', 'slots'])
        ->and($fullStarts)->not->toContain('10:00')
        ->and($fullStarts)->toContain('12:00');

    // Una pasada: ~50 slots no disparan ~3 queries de lessons cada uno.
    expect($emptyQueries)->toBeLessThan(40)
        ->and($fullQueries)->toBeLessThan(40)
        ->and($emptyLessonQueries)->toBeLessThan(5)
        ->and($fullLessonQueries)->toBeLessThan(5);
});
