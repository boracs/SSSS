<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\User;
use Database\Seeders\Concerns\SeedsVipAcademyEnrollments;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Inscripciones de academia para usuarios VIP (bono confirmado + consumos coherentes + notas de monitor).
 */
final class VipAcademyEnrollmentsSeeder extends Seeder
{
    use SeedsVipAcademyEnrollments;

    public function run(): void
    {
        DB::transaction(function (): void {
            $monitors = User::query()
                ->whereIn('email', ['monitor1@gmail.com', 'monitor2@gmail.com'])
                ->orderBy('id')
                ->get();

            $admin = User::query()->where('email', 'admin@gmail.com')->first();

            $this->ensureVipLessonPool($monitors, 14);

            $this->addNotesToExistingVipAttended($admin);

            $count = $this->seedAllVipAcademyEnrollments($admin);

            $this->command?->info("VipAcademyEnrollmentsSeeder: {$count} inscripción(es) VIP nuevas.");
        });
    }

    /**
     * Añade feedback de monitor a asistencias VIP previas sin nota.
     */
    private function addNotesToExistingVipAttended(?User $fallbackAuthor): void
    {
        $noteIndex = 0;
        $enrollments = \App\Models\LessonUser::query()
            ->with('lesson')
            ->where('payment_method', 'bono_vip')
            ->where('status', \App\Models\LessonUser::STATUS_ATTENDED)
            ->orderBy('id')
            ->get();

        foreach ($enrollments as $enrollment) {
            if ($enrollment->lesson === null) {
                continue;
            }

            $student = User::query()->find($enrollment->user_id);
            if ($student === null) {
                continue;
            }

            $this->attachMonitorNote($student, $enrollment, $enrollment->lesson, $fallbackAuthor, $noteIndex++);
        }
    }
}
