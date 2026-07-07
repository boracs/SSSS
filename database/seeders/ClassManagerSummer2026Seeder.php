<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Lesson;
use App\Models\LessonUser;
use App\Models\StaffAssignment;
use App\Models\User;
use App\Support\BusinessDateTime;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * Clases demo jun–ago 2026 para probar el gestor de clases:
 * días con 0, 1, 3 o 6 sesiones mezclando modalidades.
 */
class ClassManagerSummer2026Seeder extends Seeder
{
    private const MARKER = 'CM-SUM26';

    /** @var list<int> */
    private const HOURS = [9, 11, 13, 16, 18, 19];

    /** @var list<string> */
    private const LEVELS = [
        Lesson::LEVEL_INICIACION,
        Lesson::LEVEL_INTERMEDIO,
        Lesson::LEVEL_AVANZADO,
    ];

    /** @var list<string> */
    private const MODALITIES = [
        Lesson::MODALITY_GRUPAL,
        'vip',
        Lesson::MODALITY_PARTICULAR,
        Lesson::MODALITY_SEMANAL,
    ];

    public function run(): void
    {
        $staff = User::query()
            ->where('role', 'admin')
            ->orderBy('id')
            ->get();

        if ($staff->isEmpty()) {
            $this->command?->warn('ClassManagerSummer2026Seeder: no hay staff admin.');

            return;
        }

        $students = User::query()
            ->where('role', '!=', 'admin')
            ->orderBy('id')
            ->limit(12)
            ->get();

        $tz = BusinessDateTime::businessTimezone();
        $start = Carbon::create(2026, 6, 1, 0, 0, 0, $tz)->startOfDay();
        $end = Carbon::create(2026, 8, 31, 0, 0, 0, $tz)->endOfDay();

        $created = 0;
        $cursor = $start->copy();

        while ($cursor->lte($end)) {
            $count = $this->classesForDay($cursor);
            for ($i = 0; $i < $count; $i++) {
                $this->seedLesson($cursor, $i, $staff, $students);
                $created++;
            }
            $cursor->addDay();
        }

        $this->command?->info("ClassManagerSummer2026Seeder: {$created} clases (jun–ago 2026).");
    }

    private function classesForDay(Carbon $day): int
    {
        $d = (int) $day->format('j');
        $m = (int) $day->format('n');

        $pattern = match ($m) {
            6 => [0, 1, 3, 6, 0, 1, 3, 6, 1, 0, 3, 6, 0, 1, 3, 0, 6, 1, 3, 0, 1, 6, 3, 0, 1, 3, 6, 0, 1, 3],
            7 => [3, 6, 1, 0, 3, 6, 0, 1, 3, 6, 0, 1, 6, 3, 0, 1, 3, 0, 6, 1, 0, 3, 6, 1, 0, 3, 1, 6, 0, 3, 6],
            8 => [1, 0, 3, 6, 0, 1, 3, 0, 6, 1, 3, 0, 1, 6, 3, 0, 1, 3, 6, 0, 3, 1, 0, 6, 3, 1, 0, 3, 6, 1, 0],
            default => [1, 0, 3],
        };

        return $pattern[($d - 1) % count($pattern)];
    }

    /**
     * @param  \Illuminate\Support\Collection<int, User>  $staff
     * @param  \Illuminate\Support\Collection<int, User>  $students
     */
    private function seedLesson(Carbon $day, int $index, $staff, $students): void
    {
        $dateKey = $day->format('Y-m-d');
        $title = sprintf('%s %s #%d', self::MARKER, $dateKey, $index + 1);
        $hour = self::HOURS[$index % count(self::HOURS)];
        $modality = self::MODALITIES[($day->dayOfYear + $index) % count(self::MODALITIES)];
        $level = self::LEVELS[($day->dayOfYear + $index) % count(self::LEVELS)];
        $isPrivate = $modality === Lesson::MODALITY_PARTICULAR;
        $maxSlots = match ($modality) {
            Lesson::MODALITY_PARTICULAR => 6,
            'vip' => 12,
            Lesson::MODALITY_GRUPAL => 8,
            default => 6,
        };

        $startsAt = $day->copy()->setTime($hour, 0, 0);
        $endsAt = $startsAt->copy()->addMinutes(90);
        $isPast = $startsAt->isPast();

        $lesson = Lesson::query()->updateOrCreate(
            ['title' => $title],
            [
                'description' => 'Clase demo gestor verano 2026.',
                'starts_at' => $startsAt,
                'ends_at' => $endsAt,
                'type' => Lesson::TYPE_SURF,
                'modality' => $modality,
                'batch_id' => $modality === Lesson::MODALITY_SEMANAL ? Str::uuid()->toString() : null,
                'level' => $level,
                'max_slots' => $maxSlots,
                'max_capacity' => $maxSlots,
                'price' => 35,
                'currency' => 'EUR',
                'location' => 'Playa Zurriola',
                'is_private' => $isPrivate,
                'is_surf_trip' => false,
                'is_optimal_waves' => ($index + $day->dayOfYear) % 11 === 0,
                'status' => $isPast ? Lesson::STATUS_COMPLETED : Lesson::STATUS_SCHEDULED,
            ]
        );

        $monitor = $staff->get($index % $staff->count());
        if ($monitor) {
            StaffAssignment::query()->firstOrCreate([
                'lesson_id' => $lesson->id,
                'user_id' => $monitor->id,
                'role' => StaffAssignment::ROLE_MONITOR,
            ]);
        }

        if (($index + $day->dayOfYear) % 3 === 0 && $staff->count() > 1) {
            $photographer = $staff->get(($index + 1) % $staff->count());
            if ($photographer) {
                StaffAssignment::query()->firstOrCreate([
                    'lesson_id' => $lesson->id,
                    'user_id' => $photographer->id,
                    'role' => StaffAssignment::ROLE_FOTOGRAFO,
                ]);
            }
        }

        if ($students->isEmpty()) {
            return;
        }

        $enrollCount = match ($modality) {
            'vip' => min(4, max(1, ($index % 4) + 1)),
            Lesson::MODALITY_PARTICULAR => min(3, ($index % 3) + 1),
            default => min(6, ($index % 5) + ($day->dayOfYear % 3)),
        };

        $enrollCount = max(0, min($enrollCount, $students->count()));

        foreach ($students->take($enrollCount) as $si => $student) {
            LessonUser::query()->firstOrCreate(
                [
                    'lesson_id' => $lesson->id,
                    'user_id' => $student->id,
                ],
                [
                    'party_size' => $modality === Lesson::MODALITY_PARTICULAR ? 2 : 1,
                    'quantity' => 1,
                    'credits_locked' => 1,
                    'status' => $isPast ? LessonUser::STATUS_ATTENDED : LessonUser::STATUS_ENROLLED,
                    'payment_status' => LessonUser::PAYMENT_CONFIRMED,
                    'confirmed_at' => $startsAt->copy()->subDays(2 + $si),
                ]
            );
        }
    }
}
