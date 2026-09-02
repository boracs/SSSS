<?php

declare(strict_types=1);

use App\Http\Controllers\Admin\ClassManagerController;
use App\Models\Lesson;
use App\Models\User;
use App\Support\BusinessDateTime;
use Illuminate\Support\Facades\DB;

/**
 * @param  array<string, mixed>  $overrides
 */
function classManagerLesson(string $monthDay, string $time, array $overrides = []): Lesson
{
    $start = BusinessDateTime::parseInAppTimezone($monthDay.' '.$time);

    return Lesson::query()->create(array_merge([
        'title' => 'Class-manager '.$time,
        'starts_at' => $start,
        'ends_at' => $start->copy()->addMinutes(90),
        'type' => Lesson::TYPE_SURF,
        'modality' => Lesson::MODALITY_GRUPAL,
        'level' => Lesson::LEVEL_INICIACION,
        'max_slots' => 6,
        'max_capacity' => 6,
        'price' => 40,
        'status' => Lesson::STATUS_SCHEDULED,
    ], $overrides));
}

function classManagerQueryCount(string $table): int
{
    return collect(DB::getQueryLog())
        ->filter(function (array $query) use ($table): bool {
            $sql = strtolower($query['query']);

            return str_contains($sql, '`'.$table.'`') || str_contains($sql, '"'.$table.'"');
        })
        ->count();
}

test('R1: class-manager no llama preview por clase y las queries no crecen 3N', function () {
    $method = (new ReflectionClass(ClassManagerController::class))->getMethod('mapLesson');
    $body = implode('', array_slice(
        file($method->getFileName()),
        $method->getStartLine() - 1,
        $method->getEndLine() - $method->getStartLine() + 1,
    ));

    expect($body)->toContain('evaluateLoaded')
        ->and($body)->not->toContain('->preview(');

    $admin = User::factory()->create(['role' => 'admin']);
    $month = '2030-03';

    foreach (range(1, 8) as $day) {
        classManagerLesson(sprintf('2030-03-%02d', $day), '10:00');
    }

    DB::flushQueryLog();
    DB::enableQueryLog();

    $this->actingAs($admin)
        ->get(route('admin.class-manager.index', ['month' => $month]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Admin/ClassManager/Index')
            ->has('lessons', 8)
            ->has('lessons.0.staff_capacity_status')
            ->has('lessons.0.occupancy')
            ->has('lessons.0.max_capacity'));

    $queriesEight = count(DB::getQueryLog());
    $lessonQueriesEight = classManagerQueryCount('lessons');

    foreach (range(9, 20) as $day) {
        classManagerLesson(sprintf('2030-03-%02d', $day), '10:00');
    }

    DB::flushQueryLog();
    DB::enableQueryLog();

    $this->actingAs($admin)
        ->get(route('admin.class-manager.index', ['month' => $month]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Admin/ClassManager/Index')
            ->has('lessons', 20)
            ->has('lessons.0.staff_capacity_status'));

    $queriesTwenty = count(DB::getQueryLog());
    $lessonQueriesTwenty = classManagerQueryCount('lessons');

    // Criterio real: no lineal 3 queries extra × N. 12 clases más no pueden sumar ~36 queries.
    expect($queriesTwenty - $queriesEight)->toBeLessThan(20)
        ->and($lessonQueriesEight)->toBe($lessonQueriesTwenty);
});
