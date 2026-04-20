<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\CreditTransaction;
use App\Models\Lesson;
use App\Models\LessonUser;
use App\Models\User;
use App\Support\BusinessDateTime;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CreditEngineService
{
    /**
     * El lock real de créditos se ejecuta en la auditoría 1h antes (runOneHourBeforeAudit).
     * Este método solo valida que el usuario tenga balance suficiente para el peor caso (2 créditos).
     */
    public function canAffordEnrollment(User $user, Lesson $lesson): bool
    {
        // Fase 1 de refactor: credits_balance eliminado de users.
        // Se permite continuar el flujo mientras se migra a Bonos Prepago.
        return true;
    }

    /**
     * Auditoría 1h antes: si enrollments == 1 → lock 2 créditos; si > 1 → lock 1 crédito.
     * Ajusta los enrollments que aún tengan credits_locked en 0 (pendientes de lock).
     */
    public function runOneHourBeforeAudit(Lesson $lesson): void
    {
        Log::info('CreditEngineService::runOneHourBeforeAudit desactivado temporalmente (Fase 1).', [
            'lesson_id' => $lesson->id,
        ]);
    }

    /**
     * Devuelve créditos al wallet (cancelación Admin por Mal Mar u otra razón que devuelva).
     */
    public function refundCredits(LessonUser $enrollment, string $reason = 'Mal mar'): void
    {
        // Fase 1: se conserva trazabilidad sin tocar saldo en users.
        $credits = (int) $enrollment->credits_locked;
        DB::transaction(function () use ($enrollment, $credits, $reason) {
            $enrollment->update([
                'status' => LessonUser::STATUS_REFUNDED,
                'credits_locked' => 0,
                'cancelled_at' => BusinessDateTime::now(),
            ]);

            if ($credits > 0) {
                CreditTransaction::create([
                    'user_id' => $enrollment->user_id,
                    'amount' => $credits,
                    'type' => CreditTransaction::TYPE_LESSON_REFUND,
                    'lesson_id' => $enrollment->lesson_id,
                    'lesson_user_id' => $enrollment->id,
                    'description' => '[LEGACY_SIN_SALDO] '.$reason,
                ]);
            }
        });
    }

    /**
     * Cancelación por el alumno: si es con menos de 24h, no devuelve créditos.
     */
    public function cancelByStudent(LessonUser $enrollment): void
    {
        $lesson = $enrollment->lesson;
        $hoursUntilStart = BusinessDateTime::now()->diffInHours($lesson->starts_at, false);

        $enrollment->update([
            'status' => LessonUser::STATUS_CANCELLED,
            'cancelled_at' => BusinessDateTime::now(),
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
        // Fase 1: sin columna credits_balance; conservar solo auditoría.
        CreditTransaction::create([
            'user_id' => $user->id,
            'amount' => $amount,
            'type' => CreditTransaction::TYPE_PURCHASE,
            'description' => '[LEGACY_SIN_SALDO] '.$description,
        ]);
    }
}
