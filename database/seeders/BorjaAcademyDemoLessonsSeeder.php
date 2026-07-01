<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Lesson;
use App\Models\LessonUser;
use App\Models\StaffAssignment;
use App\Models\User;
use Database\Seeders\Concerns\SeedsBonoConsumptions;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * Clases demo visibles en /academia para borjauser@gmail.com:
 * ~7 grupal, ~7 semanal, ~7 VIP (mayoría futuras, algunas pasadas).
 */
class BorjaAcademyDemoLessonsSeeder extends Seeder
{
    use SeedsBonoConsumptions;

    private const MARKER = 'BORJA-DEMO';

    public function run(): void
    {
        $monitor = $this->resolveMonitor();
        if (! $monitor) {
            $this->command?->warn('BorjaAcademyDemoLessonsSeeder: sin monitor/admin.');

            return;
        }

        $borja = User::query()->where('email', 'borjauser@gmail.com')->first();
        if (! $borja) {
            $this->command?->warn('BorjaAcademyDemoLessonsSeeder: usuario borjauser@gmail.com no encontrado.');

            return;
        }

        $this->seedGrupalLessons($monitor, $borja);
        $this->seedSemanalLessons($monitor, $borja);
        $this->seedVipLessons($monitor, $borja);

        $this->command?->info('BorjaAcademyDemoLessonsSeeder: 21 clases demo (grupal/semanal/vip) listas.');
    }

    private function seedGrupalLessons(User $monitor, User $borja): void
    {
        $slots = [
            ['days' => -8, 'hour' => 10, 'level' => Lesson::LEVEL_INICIACION, 'past' => true],
            ['days' => -3, 'hour' => 17, 'level' => Lesson::LEVEL_INTERMEDIO, 'past' => true],
            ['days' => 0, 'hour' => 18, 'level' => Lesson::LEVEL_INICIACION],
            ['days' => 1, 'hour' => 9, 'level' => Lesson::LEVEL_INICIACION],
            ['days' => 2, 'hour' => 11, 'level' => Lesson::LEVEL_INTERMEDIO],
            ['days' => 5, 'hour' => 10, 'level' => Lesson::LEVEL_AVANZADO],
            ['days' => 9, 'hour' => 17, 'level' => Lesson::LEVEL_INICIACION],
        ];

        foreach ($slots as $i => $slot) {
            $this->upsertLesson(
                monitor: $monitor,
                borja: $borja,
                title: sprintf('%s Grupal #%d', self::MARKER, $i + 1),
                modality: Lesson::MODALITY_GRUPAL,
                slot: $slot,
                isPrivate: false,
                maxSlots: 8,
                price: 35.0,
            );
        }
    }

    private function seedSemanalLessons(User $monitor, User $borja): void
    {
        $batchA = Str::uuid()->toString();
        $batchB = Str::uuid()->toString();

        $slots = [
            ['days' => -10, 'hour' => 9, 'level' => Lesson::LEVEL_INICIACION, 'past' => true, 'batch' => $batchA],
            ['days' => -6, 'hour' => 9, 'level' => Lesson::LEVEL_INICIACION, 'past' => true, 'batch' => $batchA],
            ['days' => 1, 'hour' => 9, 'level' => Lesson::LEVEL_INTERMEDIO, 'batch' => $batchB],
            ['days' => 2, 'hour' => 9, 'level' => Lesson::LEVEL_INTERMEDIO, 'batch' => $batchB],
            ['days' => 3, 'hour' => 9, 'level' => Lesson::LEVEL_INTERMEDIO, 'batch' => $batchB],
            ['days' => 6, 'hour' => 9, 'level' => Lesson::LEVEL_INICIACION, 'batch' => null],
            ['days' => 11, 'hour' => 9, 'level' => Lesson::LEVEL_AVANZADO, 'batch' => null],
        ];

        foreach ($slots as $i => $slot) {
            $this->upsertLesson(
                monitor: $monitor,
                borja: $borja,
                title: sprintf('%s Semanal #%d', self::MARKER, $i + 1),
                modality: Lesson::MODALITY_SEMANAL,
                slot: $slot,
                isPrivate: false,
                maxSlots: 6,
                price: 42.0,
                batchId: $slot['batch'] ?? null,
            );
        }
    }

    private function seedVipLessons(User $monitor, User $borja): void
    {
        $slots = [
            ['days' => -7, 'hour' => 11, 'level' => Lesson::LEVEL_INTERMEDIO, 'past' => true],
            ['days' => -1, 'hour' => 16, 'level' => Lesson::LEVEL_AVANZADO, 'past' => true],
            ['days' => 0, 'hour' => 19, 'level' => Lesson::LEVEL_INTERMEDIO],
            ['days' => 2, 'hour' => 10, 'level' => Lesson::LEVEL_AVANZADO],
            ['days' => 4, 'hour' => 12, 'level' => Lesson::LEVEL_INTERMEDIO],
            ['days' => 8, 'hour' => 17, 'level' => Lesson::LEVEL_INICIACION],
            ['days' => 14, 'hour' => 10, 'level' => Lesson::LEVEL_AVANZADO],
        ];

        foreach ($slots as $i => $slot) {
            $this->upsertLesson(
                monitor: $monitor,
                borja: $borja,
                title: sprintf('%s VIP #%d', self::MARKER, $i + 1),
                modality: 'vip',
                slot: $slot,
                isPrivate: false,
                maxSlots: 4,
                price: 55.0,
            );
        }
    }

    /**
     * @param  array{days: int, hour: int, level: string, past?: bool, batch?: ?string}  $slot
     */
    private function upsertLesson(
        User $monitor,
        User $borja,
        string $title,
        string $modality,
        array $slot,
        bool $isPrivate,
        int $maxSlots,
        float $price,
        ?string $batchId = null,
    ): void {
        $start = Carbon::now()->addDays((int) $slot['days'])->setTime((int) $slot['hour'], 0, 0);
        if ($start->lessThanOrEqualTo(Carbon::now()) && empty($slot['past'])) {
            $start = Carbon::now()->addDay()->setTime((int) $slot['hour'], 0, 0);
        }

        $isPast = ! empty($slot['past']) || $start->lessThan(Carbon::now());
        $status = $isPast ? Lesson::STATUS_COMPLETED : Lesson::STATUS_SCHEDULED;

        $lesson = Lesson::query()->updateOrCreate(
            ['title' => $title],
            [
                'description' => sprintf(
                    'Clase %s de demostración (%s). %s',
                    strtoupper($modality),
                    self::MARKER,
                    $isPast ? 'Sesión ya impartida.' : 'Plazas disponibles — reserva desde Academia.'
                ),
                'starts_at' => $start,
                'ends_at' => (clone $start)->addMinutes(90),
                'type' => Lesson::TYPE_SURF,
                'modality' => $modality,
                'batch_id' => $batchId ?? ($slot['batch'] ?? null),
                'level' => $slot['level'],
                'max_slots' => $maxSlots,
                'max_capacity' => $maxSlots,
                'price' => $price,
                'currency' => 'EUR',
                'location' => 'Playa Zurriola',
                'is_private' => $isPrivate,
                'is_surf_trip' => false,
                'is_optimal_waves' => false,
                'status' => $status,
            ]
        );

        StaffAssignment::query()->firstOrCreate([
            'lesson_id' => $lesson->id,
            'user_id' => $monitor->id,
            'role' => StaffAssignment::ROLE_MONITOR,
        ]);

        if ($isPast) {
            LessonUser::query()->firstOrCreate(
                ['lesson_id' => $lesson->id, 'user_id' => $borja->id],
                [
                    'party_size' => 1,
                    'quantity' => 1,
                    'credits_locked' => 1,
                    'status' => LessonUser::STATUS_ATTENDED,
                    'payment_status' => LessonUser::PAYMENT_CONFIRMED,
                    'confirmed_at' => (clone $start)->subDays(2),
                ]
            );
        }
    }
}
