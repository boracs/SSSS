<?php

namespace App\Services;

use App\Models\LessonUser;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AutoReleaseService
{
    /**
     * Limpia reservas fantasma:
     * - status pending
     * - sin comprobante
     * - 2h desde creación (o 30 min si la clase empieza en < 4h)
     */
    public function cleanupExpiredReservations(): array
    {
        $now = Carbon::now('UTC');
        $releasedByLesson = [];
        $releasedTotal = 0;

        DB::transaction(function () use ($now, &$releasedByLesson, &$releasedTotal) {
            $rows = LessonUser::query()
                ->with(['lesson'])
                ->where('status', LessonUser::STATUS_PENDING)
                ->whereNull('payment_proof_path')
                ->whereHas('lesson')
                ->lockForUpdate()
                ->get();

            foreach ($rows as $enrollment) {
                $lesson = $enrollment->lesson;
                if (! $lesson || ! $lesson->starts_at) {
                    continue;
                }

                $startsAt = $lesson->starts_at->copy()->utc();
                $createdAt = $enrollment->created_at->copy()->utc();

                $isLastMinute = $startsAt->lte($now->copy()->addHours(4));
                $graceMinutes = $isLastMinute ? 30 : 120;
                $deadline = $createdAt->copy()->addMinutes($graceMinutes);

                if ($now->lt($deadline)) {
                    continue;
                }

                $enrollment->status = LessonUser::STATUS_EXPIRED;
                $enrollment->expires_at = $deadline;
                $enrollment->save();

                $releasedTotal++;
                $releasedByLesson[$lesson->id] = ($releasedByLesson[$lesson->id] ?? 0) + (int) ($enrollment->party_size ?? 1);
            }
        });

        foreach ($releasedByLesson as $lessonId => $releasedSeats) {
            Log::info("[Auto-Cleanup]: Liberadas {$releasedSeats} plazas de la lección ID {$lessonId} por expiración de tiempo");
        }

        return [
            'total_released' => $releasedTotal,
            'released_by_lesson' => $releasedByLesson,
        ];
    }
}

