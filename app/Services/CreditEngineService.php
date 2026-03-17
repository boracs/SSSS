<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\CreditTransaction;
use App\Models\Lesson;
use App\Models\LessonUser;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class CreditEngineService
{
    /**
     * El lock real de créditos se ejecuta en la auditoría 1h antes (runOneHourBeforeAudit).
     * Este método solo valida que el usuario tenga balance suficiente para el peor caso (2 créditos).
     */
    public function canAffordEnrollment(User $user, Lesson $lesson): bool
    {
        return $user->credits_balance >= 2;
    }

    /**
     * Auditoría 1h antes: si enrollments == 1 → lock 2 créditos; si > 1 → lock 1 crédito.
     * Ajusta los enrollments que aún tengan credits_locked en 0 (pendientes de lock).
     */
    public function runOneHourBeforeAudit(Lesson $lesson): void
    {
        $enrolled = $lesson->enrollments()->whereIn('status', ['enrolled'])->get();
        $count = $enrolled->count();

        if ($count === 0) {
            return;
        }

        $creditsPerStudent = $count === 1 ? 2 : 1;

        foreach ($enrolled as $enrollment) {
            $user = $enrollment->user;
            $currentLock = (int) $enrollment->credits_locked;

            if ($currentLock >= $creditsPerStudent) {
                continue;
            }

            $toDeduct = $creditsPerStudent - $currentLock;
            if ($user->credits_balance < $toDeduct) {
                continue;
            }

            DB::transaction(function () use ($enrollment, $user, $lesson, $creditsPerStudent, $toDeduct) {
                $enrollment->update(['credits_locked' => $creditsPerStudent]);
                $user->decrement('credits_balance', $toDeduct);
                CreditTransaction::create([
                    'user_id' => $user->id,
                    'amount' => -$toDeduct,
                    'type' => CreditTransaction::TYPE_LESSON_LOCK,
                    'lesson_id' => $lesson->id,
                    'lesson_user_id' => $enrollment->id,
                    'description' => $creditsPerStudent === 2 ? 'Sesión particular (1 alumno)' : 'Clase grupal',
                ]);
            });

            if ($creditsPerStudent === 2) {
                event(new \App\Events\SoloStudentLocked($lesson, $enrollment));
            }
        }
    }

    /**
     * Devuelve créditos al wallet (cancelación Admin por Mal Mar u otra razón que devuelva).
     */
    public function refundCredits(LessonUser $enrollment, string $reason = 'Mal mar'): void
    {
        $credits = (int) $enrollment->credits_locked;
        if ($credits <= 0) {
            return;
        }

        $user = $enrollment->user;

        DB::transaction(function () use ($enrollment, $user, $credits, $reason) {
            $enrollment->update([
                'status' => LessonUser::STATUS_REFUNDED,
                'credits_locked' => 0,
                'cancelled_at' => now(),
            ]);

            $user->increment('credits_balance', $credits);

            CreditTransaction::create([
                'user_id' => $user->id,
                'amount' => $credits,
                'type' => CreditTransaction::TYPE_LESSON_REFUND,
                'lesson_id' => $enrollment->lesson_id,
                'lesson_user_id' => $enrollment->id,
                'description' => $reason,
            ]);
        });
    }

    /**
     * Cancelación por el alumno: si es con menos de 24h, no devuelve créditos.
     */
    public function cancelByStudent(LessonUser $enrollment): void
    {
        $lesson = $enrollment->lesson;
        $hoursUntilStart = now()->diffInHours($lesson->starts_at, false);

        $enrollment->update([
            'status' => LessonUser::STATUS_CANCELLED,
            'cancelled_at' => now(),
        ]);

        if ($hoursUntilStart >= 24) {
            $this->refundCredits($enrollment, 'Cancelación alumno (≥24h)');
        }
        // Si < 24h, no devolvemos; los créditos ya se descontaron
    }

    /**
     * Comprar créditos (admin o sistema).
     */
    public function addCredits(User $user, int $amount, string $description = 'Compra de créditos'): void
    {
        if ($amount <= 0) {
            return;
        }
        $user->increment('credits_balance', $amount);
        CreditTransaction::create([
            'user_id' => $user->id,
            'amount' => $amount,
            'type' => CreditTransaction::TYPE_PURCHASE,
            'description' => $description,
        ]);
    }
}
