<?php

namespace App\Observers;

use App\Models\Lesson;
use App\Models\LessonUser;
use App\Services\CreditEngineService;

class LessonObserver
{
    public function __construct(
        protected CreditEngineService $creditEngine
    ) {}

    /**
     * Cuando el admin cancela la clase por "Mal Mar", devolver saldo bono/créditos a inscritos.
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
            ->whereIn('status', [LessonUser::STATUS_ENROLLED, LessonUser::STATUS_ATTENDED])
            ->get();

        foreach ($enrollments as $enrollment) {
            $viaBono = ($enrollment->payment_method ?? '') === 'bono_vip';
            if ($viaBono || (int) $enrollment->credits_locked > 0) {
                $this->creditEngine->refundCredits($enrollment, 'Clase cancelada: Mal mar');
            }
        }
    }
}
