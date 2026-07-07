<?php

declare(strict_types=1);

namespace Database\Seeders\Concerns;

use App\Enums\PaymentStatus;
use App\Models\AttendanceNote;
use App\Models\BonoConsumption;
use App\Models\Lesson;
use App\Models\LessonUser;
use App\Models\StaffAssignment;
use App\Models\User;
use App\Models\UserBono;
use App\Support\LessonBonoCreditUnits;
use Carbon\Carbon;
use Illuminate\Support\Collection;

trait SeedsVipAcademyEnrollments
{
    /** @var list<string> */
    private array $vipMonitorNotes = [
        'Buen take-off; intenta mirar hacia la orilla al remar la siguiente.',
        'Remada potente. Retrasa un poco la vertical para entrar más limpio.',
        'Control en la bajada muy sólido. Próximo paso: bottom turn más cerrado.',
        'Mejor equilibrio que la sesión anterior. Mantén las rodillas flexionadas.',
        'Entrada limpia en la ola. Cuidado con el peso demasiado atrás en la pop-up.',
        'Buen timing con la serie. Trabajaremos la posición de manos en la remada.',
        'Progresión clara: más confianza en olas con un poco más de tamaño.',
        'Buena línea en la pared. Intenta comprimir más antes del giro.',
    ];

    /**
     * Inscripciones VIP vía bono (misma lógica que EnrollStudentAction).
     */
    protected function seedVipAcademyForUser(User $user, ?User $fallbackAuthor = null): int
    {
        if (! (bool) ($user->is_vip ?? false)) {
            return 0;
        }

        $bono = UserBono::query()
            ->where('user_id', $user->id)
            ->where('status', UserBono::STATUS_CONFIRMED)
            ->where('clases_restantes', '>', 0)
            ->orderByDesc('id')
            ->first();

        if ($bono === null) {
            return 0;
        }

        $created = 0;
        $remaining = (int) $bono->clases_restantes;
        $noteIndex = 0;

        $pastLessons = Lesson::query()
            ->whereIn('status', [Lesson::STATUS_COMPLETED, Lesson::STATUS_SCHEDULED])
            ->where('starts_at', '<', Carbon::now())
            ->orderByDesc('starts_at')
            ->get();

        foreach ($pastLessons as $lesson) {
            if ($remaining <= 0 || $created >= 3) {
                break;
            }
            if ($this->vipAlreadyEnrolled($user->id, $lesson->id)) {
                continue;
            }

            $units = $this->vipUnitsForLesson($lesson, 1);
            if ($units > $remaining) {
                continue;
            }

            $enrollment = LessonUser::query()->create([
                'lesson_id' => $lesson->id,
                'user_id' => $user->id,
                'party_size' => 1,
                'quantity' => 1,
                'status' => LessonUser::STATUS_ATTENDED,
                'payment_status' => PaymentStatus::Confirmed->value,
                'payment_method' => 'bono_vip',
                'confirmed_at' => $lesson->starts_at ?? Carbon::now()->subDay(),
            ]);

            $remaining -= $units;
            BonoConsumption::query()->create([
                'user_bono_id' => $bono->id,
                'user_id' => $user->id,
                'lesson_id' => $lesson->id,
                'remaining_after' => $remaining,
                'consumed_at' => $lesson->ends_at ?? $lesson->starts_at ?? Carbon::now(),
            ]);

            $this->attachMonitorNote($user, $enrollment, $lesson, $fallbackAuthor, $noteIndex++);
            $created++;
        }

        $futureLessons = Lesson::query()
            ->where('status', Lesson::STATUS_SCHEDULED)
            ->where('starts_at', '>', Carbon::now())
            ->orderBy('starts_at')
            ->get();

        foreach ($futureLessons as $lesson) {
            if ($remaining <= 0 || $created >= 5) {
                break;
            }
            if ($this->vipAlreadyEnrolled($user->id, $lesson->id)) {
                continue;
            }

            $units = $this->vipUnitsForLesson($lesson, 1);
            if ($units > $remaining) {
                continue;
            }

            LessonUser::query()->create([
                'lesson_id' => $lesson->id,
                'user_id' => $user->id,
                'party_size' => 1,
                'quantity' => 1,
                'status' => LessonUser::STATUS_ENROLLED,
                'payment_status' => PaymentStatus::Confirmed->value,
                'payment_method' => 'bono_vip',
                'confirmed_at' => Carbon::now(),
            ]);

            $remaining -= $units;
            BonoConsumption::query()->create([
                'user_bono_id' => $bono->id,
                'user_id' => $user->id,
                'lesson_id' => $lesson->id,
                'remaining_after' => $remaining,
                'consumed_at' => Carbon::now(),
            ]);

            $created++;
        }

        $bono->update(['clases_restantes' => max(0, $remaining)]);

        return $created;
    }

    protected function seedAllVipAcademyEnrollments(?User $fallbackAuthor = null): int
    {
        $total = 0;
        User::query()
            ->where('is_vip', true)
            ->orderBy('id')
            ->each(function (User $vip) use ($fallbackAuthor, &$total): void {
                $total += $this->seedVipAcademyForUser($vip, $fallbackAuthor);
            });

        return $total;
    }

    /**
     * Amplía el calendario si hay pocas clases para repartir entre VIPs.
     */
    protected function ensureVipLessonPool(Collection $monitors, int $minimum = 12): void
    {
        $current = (int) Lesson::query()->count();
        if ($current >= $minimum || $monitors->isEmpty()) {
            return;
        }

        $needed = $minimum - $current;
        $levels = [Lesson::LEVEL_INICIACION, Lesson::LEVEL_INTERMEDIO, Lesson::LEVEL_AVANZADO];

        for ($i = 0; $i < $needed; $i++) {
            $offset = -21 + ($i * 2);
            $start = Carbon::now()->addDays($offset)->setTime(9 + ($i % 4), ($i % 2) * 30);
            $end = (clone $start)->addMinutes(90);
            $modality = $i % 5 === 0 ? Lesson::MODALITY_PARTICULAR : Lesson::MODALITY_GRUPAL;

            $lesson = Lesson::query()->create([
                'title' => 'Clase VIP pool · '.$start->format('d/m H:i'),
                'description' => 'Sesión demo academia S4.',
                'starts_at' => $start,
                'ends_at' => $end,
                'type' => Lesson::TYPE_SURF,
                'modality' => $modality,
                'level' => $levels[$i % count($levels)],
                'max_slots' => $modality === Lesson::MODALITY_PARTICULAR ? 1 : 8,
                'max_capacity' => $modality === Lesson::MODALITY_PARTICULAR ? 1 : 8,
                'price' => 35,
                'currency' => 'EUR',
                'location' => 'Playa Zurriola',
                'is_private' => $modality === Lesson::MODALITY_PARTICULAR,
                'status' => $start->isPast() ? Lesson::STATUS_COMPLETED : Lesson::STATUS_SCHEDULED,
            ]);

            $monitor = $monitors[$i % $monitors->count()];
            StaffAssignment::query()->firstOrCreate(
                [
                    'lesson_id' => $lesson->id,
                    'user_id' => $monitor->id,
                    'role' => StaffAssignment::ROLE_MONITOR,
                ],
            );
        }
    }

    private function vipAlreadyEnrolled(int $userId, int $lessonId): bool
    {
        return LessonUser::query()
            ->where('lesson_id', $lessonId)
            ->where('user_id', $userId)
            ->whereIn('status', [
                LessonUser::STATUS_PENDING,
                LessonUser::STATUS_PENDING_EXTRA_MONITOR,
                LessonUser::STATUS_CONFIRMED,
                LessonUser::STATUS_ENROLLED,
                LessonUser::STATUS_ATTENDED,
            ])
            ->exists();
    }

    private function vipUnitsForLesson(Lesson $lesson, int $partySize): int
    {
        return LessonBonoCreditUnits::unitsForCharge(
            (string) ($lesson->modality ?? ''),
            max(1, $partySize)
        );
    }

    protected function attachMonitorNote(
        User $student,
        LessonUser $enrollment,
        Lesson $lesson,
        ?User $fallbackAuthor,
        int $noteIndex,
    ): void {
        if (AttendanceNote::query()
            ->where('reservation_type', LessonUser::class)
            ->where('reservation_id', $enrollment->id)
            ->exists()) {
            return;
        }

        $monitorId = StaffAssignment::query()
            ->where('lesson_id', $lesson->id)
            ->where('role', StaffAssignment::ROLE_MONITOR)
            ->value('user_id');

        $authorId = $monitorId ?? $fallbackAuthor?->id;
        if ($authorId === null) {
            return;
        }

        $body = $this->vipMonitorNotes[$noteIndex % count($this->vipMonitorNotes)];

        AttendanceNote::query()->create([
            'user_id' => $student->id,
            'reservation_type' => LessonUser::class,
            'reservation_id' => $enrollment->id,
            'body' => $body,
            'is_visible_to_student' => true,
            'admin_id' => $authorId,
        ]);
    }
}
