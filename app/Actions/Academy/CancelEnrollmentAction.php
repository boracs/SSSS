<?php

declare(strict_types=1);

namespace App\Actions\Academy;

use App\Models\LessonUser;
use App\Services\CreditEngineService;
use App\Support\AcademyEnrollmentPolicy;
use App\Support\BusinessDateTime;

final class CancelEnrollmentAction
{
    public function __construct(
        private readonly CreditEngineService $creditEngine,
    ) {}

    /**
     * @return array{ok: bool, message: string}
     */
    public function execute(LessonUser $enrollment, ?string $latePolicy = null, bool $isAdmin = false): array
    {
        $enrollment->loadMissing('lesson');
        $lesson = $enrollment->lesson;

        if ($lesson?->starts_at && BusinessDateTime::now()->gte($lesson->starts_at)) {
            return ['ok' => false, 'message' => 'La clase ya ha comenzado; no se puede cancelar desde aquí.'];
        }

        if (! $isAdmin && ! AcademyEnrollmentPolicy::canCancelByTime($lesson)) {
            return ['ok' => false, 'message' => AcademyEnrollmentPolicy::cancelBlockedMessage()];
        }

        if (in_array($enrollment->status, [
            LessonUser::STATUS_CANCELLED,
            LessonUser::STATUS_CANCELLED_FREE,
            LessonUser::STATUS_CANCELLED_LATE_LOST,
            LessonUser::STATUS_CANCELLED_LATE_RESCUED,
            LessonUser::STATUS_REFUNDED,
            LessonUser::STATUS_EXPIRED,
        ], true)) {
            return ['ok' => false, 'message' => 'Esta reserva ya no está activa.'];
        }

        if ($enrollment->status === LessonUser::STATUS_ATTENDED) {
            return ['ok' => false, 'message' => 'No se puede cancelar una clase ya marcada como asistida.'];
        }

        $paymentPending = ($enrollment->payment_status ?? '') === LessonUser::PAYMENT_PENDING;
        $noProof = empty($enrollment->payment_proof_path);
        if ($paymentPending && $noProof && $enrollment->created_at
            && $enrollment->created_at->copy()->addMinutes(30)->isPast()) {
            return ['ok' => false, 'message' => 'La sesión de pago ha expirado; esta reserva ya no se puede cancelar desde aquí.'];
        }

        if (in_array($enrollment->status, [
            LessonUser::STATUS_PENDING,
            LessonUser::STATUS_PENDING_EXTRA_MONITOR,
            LessonUser::STATUS_CONFIRMED,
        ], true)) {
            $enrollment->update([
                'status' => LessonUser::STATUS_CANCELLED,
                'cancelled_at' => BusinessDateTime::now(),
            ]);

            return ['ok' => true, 'message' => 'Reserva cancelada.'];
        }

        if ($enrollment->status === LessonUser::STATUS_ENROLLED) {
            $startsAt = $lesson?->starts_at;
            if (! $startsAt) {
                return ['ok' => false, 'message' => 'La clase no tiene fecha de inicio válida.'];
            }

            $hoursUntilStart = BusinessDateTime::now()->diffInHours($startsAt, false);
            $cancelHours = AcademyEnrollmentPolicy::cancelCutoffHours();

            if ($hoursUntilStart >= $cancelHours) {
                $this->creditEngine->cancelByStudent($enrollment);

                return ['ok' => true, 'message' => 'Inscripción cancelada.'];
            }

            if (! in_array($latePolicy, ['lose', 'rescue'], true)) {
                return [
                    'ok' => false,
                    'message' => "Cancelación con menos de {$cancelHours}h: indica si aceptas perder la clase o solicitar rescate (lose/rescue).",
                ];
            }

            $status = $latePolicy === 'rescue'
                ? LessonUser::STATUS_CANCELLED_LATE_RESCUED
                : LessonUser::STATUS_CANCELLED_LATE_LOST;

            $enrollment->update([
                'status' => $status,
                'cancelled_at' => BusinessDateTime::now(),
            ]);

            return ['ok' => true, 'message' => 'Cancelación fuera de plazo registrada.'];
        }

        return ['ok' => false, 'message' => 'Este estado de reserva no admite cancelación automática.'];
    }
}
