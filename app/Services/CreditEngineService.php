<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\BonoConsumption;
use App\Models\CreditTransaction;
use App\Models\Lesson;
use App\Models\LessonUser;
use App\Models\User;
use App\Models\UserBono;
use App\Support\BusinessDateTime;
use App\Support\LessonBonoCreditUnits;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CreditEngineService
{
    /**
     * Comprueba saldo atómico en bonos VIP confirmados (sin bypass legacy).
     */
    public function canAffordEnrollment(User $user, Lesson $lesson, int $partySize = 1): bool
    {
        $unitsRequired = LessonBonoCreditUnits::unitsForCharge(
            (string) ($lesson->modality ?? ''),
            max(1, $partySize)
        );

        return UserBono::query()
            ->where('user_id', $user->id)
            ->where('status', UserBono::STATUS_CONFIRMED)
            ->where('clases_restantes', '>=', $unitsRequired)
            ->exists();
    }

    /**
     * Reservas VIP consumen saldo en EnrollStudentAction (UserBono + BonoConsumption).
     * La auditoría horaria del sistema legacy de credits_locked queda obsoleta.
     */
    public function runOneHourBeforeAudit(Lesson $lesson): void
    {
        Log::info('CreditEngineService::runOneHourBeforeAudit omitido — saldo gestionado vía UserBono.', [
            'lesson_id' => $lesson->id,
        ]);
    }

    /**
     * Devuelve unidades al bono vigente vinculado a la inscripción.
     *
     * @return int Unidades restauradas (0 si ya estaba reembolsada).
     */
    public function refundCredits(LessonUser $enrollment, string $reason = 'Mal mar'): int
    {
        return (int) DB::transaction(function () use ($enrollment, $reason) {
            $locked = LessonUser::query()->whereKey($enrollment->id)->lockForUpdate()->firstOrFail();

            if ($locked->status === LessonUser::STATUS_REFUNDED) {
                return 0;
            }

            $consumption = $this->lockLatestConsumption($locked);
            $unitsToRestore = $this->resolveRefundUnits($locked, $consumption);

            if ($unitsToRestore > 0 && $consumption !== null && $consumption->user_bono_id !== null) {
                $bono = UserBono::query()->whereKey($consumption->user_bono_id)->lockForUpdate()->first();
                if ($bono !== null) {
                    $bono->increment('clases_restantes', $unitsToRestore);
                    Log::info('CreditEngineService::refundCredits bono restaurado', [
                        'user_bono_id' => $bono->id,
                        'lesson_user_id' => $locked->id,
                        'units' => $unitsToRestore,
                        'reason' => $reason,
                    ]);
                }
            }

            $locked->update([
                'status' => LessonUser::STATUS_REFUNDED,
                'credits_locked' => 0,
                'cancelled_at' => BusinessDateTime::now(),
            ]);

            CreditTransaction::query()->create([
                'user_id' => $locked->user_id,
                'amount' => $unitsToRestore,
                'type' => CreditTransaction::TYPE_LESSON_REFUND,
                'lesson_id' => $locked->lesson_id,
                'lesson_user_id' => $locked->id,
                'description' => $reason,
            ]);

            return $unitsToRestore;
        });
    }

    /**
     * Cancelación por el alumno: devuelve bono si ≥24h antes del inicio.
     */
    public function cancelByStudent(LessonUser $enrollment): void
    {
        $lesson = $enrollment->lesson;
        if ($lesson === null || $lesson->starts_at === null) {
            return;
        }

        $hoursUntilStart = BusinessDateTime::now()->diffInHours($lesson->starts_at, false);
        $cancelHours = (int) config('services.academy.cancel_cutoff_hours', 4);

        if ($hoursUntilStart >= $cancelHours) {
            $this->refundCredits($enrollment, "Cancelación alumno (≥{$cancelHours}h)");

            return;
        }

        $enrollment->update([
            'status' => LessonUser::STATUS_CANCELLED,
            'cancelled_at' => BusinessDateTime::now(),
        ]);
    }

    /**
     * Abono manual de clases a bono confirmado activo (admin).
     */
    public function addCredits(User $user, int $amount, string $description = 'Abono manual de clases'): void
    {
        if ($amount <= 0) {
            return;
        }

        DB::transaction(function () use ($user, $amount, $description) {
            $bono = UserBono::query()
                ->where('user_id', $user->id)
                ->where('status', UserBono::STATUS_CONFIRMED)
                ->orderByDesc('id')
                ->lockForUpdate()
                ->first();

            if ($bono === null) {
                Log::warning('CreditEngineService::addCredits sin bono confirmado', [
                    'user_id' => $user->id,
                    'amount' => $amount,
                ]);

                return;
            }

            $bono->increment('clases_restantes', $amount);

            CreditTransaction::query()->create([
                'user_id' => $user->id,
                'amount' => $amount,
                'type' => CreditTransaction::TYPE_PURCHASE,
                'description' => $description,
            ]);
        });
    }

    private function lockLatestConsumption(LessonUser $enrollment): ?BonoConsumption
    {
        if ($enrollment->user_id === null || $enrollment->lesson_id === null) {
            return null;
        }

        return BonoConsumption::query()
            ->where('user_id', $enrollment->user_id)
            ->where('lesson_id', $enrollment->lesson_id)
            ->orderByDesc('id')
            ->lockForUpdate()
            ->first();
    }

    /**
     * Unidades a devolver: las persistidas en el consumo si existen;
     * si no, el cálculo legacy (unitsForCharge por quantity de la plaza).
     */
    private function resolveRefundUnits(LessonUser $enrollment, ?BonoConsumption $consumption): int
    {
        $persisted = $consumption?->getAttributes()['units_consumed'] ?? null;
        if ($persisted !== null && $persisted !== '') {
            return max(0, (int) $persisted);
        }

        $lesson = $enrollment->relationLoaded('lesson') ? $enrollment->lesson : $enrollment->lesson()->first();
        if ($lesson === null) {
            return max(1, (int) $enrollment->credits_locked);
        }

        return LessonBonoCreditUnits::unitsForCharge(
            (string) ($lesson->modality ?? ''),
            max(1, (int) ($enrollment->quantity ?? $enrollment->party_size ?? 1))
        );
    }
}
