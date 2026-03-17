<?php

namespace App\Observers;

use App\Models\Lesson;
use App\Services\CreditEngineService;

class LessonObserver
{
    public function __construct(
        protected CreditEngineService $creditEngine
    ) {}

    /**
     * Cuando el admin cancela la clase por "Mal Mar", devolver créditos a todos los enrolled.
     */
    public function updated(Lesson $lesson): void
    {
        if ($lesson->status !== Lesson::STATUS_CANCELLED) {
            return;
        }
        if ($lesson->cancellation_reason !== Lesson::CANCELLATION_MAL_MAR) {
            return;
        }

        $enrollments = $lesson->enrollments()
            ->whereIn('status', [\App\Models\LessonUser::STATUS_ENROLLED, \App\Models\LessonUser::STATUS_ATTENDED])
            ->get();

        foreach ($enrollments as $enrollment) {
            if ((int) $enrollment->credits_locked > 0) {
                $this->creditEngine->refundCredits($enrollment, 'Clase cancelada: Mal mar');
            }
        }
    }
}
