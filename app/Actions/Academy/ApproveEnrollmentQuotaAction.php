<?php

declare(strict_types=1);

namespace App\Actions\Academy;

use App\Enums\PaymentStatus;
use App\Models\BonoConsumption;
use App\Models\Lesson;
use App\Models\LessonUser;
use App\Models\User;
use App\Models\UserBono;
use App\Services\AvailabilityService;
use App\Support\AcademyEnrollmentPolicy;
use App\Support\BusinessDateTime;
use App\Support\LessonBonoCreditUnits;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

final class ApproveEnrollmentQuotaAction
{
    public function __construct(
        private readonly AvailabilityService $availabilityService,
    ) {}

    /**
     * @return array{ok: bool, message: string}
     */
    public function execute(LessonUser $enrollment): array
    {
        return DB::transaction(function () use ($enrollment) {
            $locked = LessonUser::query()->whereKey($enrollment->id)->lockForUpdate()->firstOrFail();

            if ($locked->status !== LessonUser::STATUS_PENDING_EXTRA_MONITOR) {
                return ['ok' => false, 'message' => 'Solo se pueden aprobar solicitudes pendientes de cupo extra.'];
            }

            return $this->availabilityService->withLockedLesson((int) $locked->lesson_id, function (Lesson $lesson) use ($locked) {
                if ($lesson->status !== Lesson::STATUS_SCHEDULED) {
                    return ['ok' => false, 'message' => 'La clase ya no admite nuevas plazas.'];
                }

                if (! AcademyEnrollmentPolicy::canEnrollByTime($lesson)) {
                    return ['ok' => false, 'message' => AcademyEnrollmentPolicy::enrollBlockedMessage()];
                }

                $blockingStatuses = $this->availabilityService->occupancyStatuses();
                $blockingParty = (int) LessonUser::query()
                    ->where('lesson_id', $lesson->id)
                    ->where('id', '!=', $locked->id)
                    ->whereIn('status', $blockingStatuses)
                    ->sum(DB::raw('COALESCE(quantity, party_size, 1)'));

                $incoming = (int) ($locked->quantity ?? $locked->party_size ?? 1);
                $participantTotalAfter = $blockingParty + $incoming;

                $evaluation = $this->availabilityService->evaluate(
                    $lesson->starts_at,
                    $lesson->ends_at,
                    $participantTotalAfter,
                    (int) $lesson->id
                );

                if (! $evaluation['allowed']) {
                    return [
                        'ok' => false,
                        'message' => $this->availabilityService->buildConflictMessage($evaluation),
                    ];
                }

                $isVipBono = ($locked->payment_method ?? '') === 'bono_vip';

                if ($isVipBono && $locked->user_id) {
                    $chargeResult = $this->chargeVipBono($locked, $lesson, $participantTotalAfter);
                    if (! $chargeResult['ok']) {
                        return $chargeResult;
                    }
                }

                $targetStatus = $isVipBono
                    ? LessonUser::STATUS_ENROLLED
                    : LessonUser::STATUS_CONFIRMED;

                $paymentStatus = PaymentStatus::Confirmed->value;
                if (! $isVipBono && empty($locked->payment_proof_path)) {
                    $paymentStatus = PaymentStatus::Pending->value;
                }

                $locked->update([
                    'status' => $targetStatus,
                    'payment_status' => $paymentStatus,
                    'confirmed_at' => BusinessDateTime::now(),
                ]);

                return ['ok' => true, 'message' => 'Solicitud aceptada. La persona queda apuntada en la clase.'];
            });
        });
    }

    /** @return array{ok: bool, message: string} */
    private function chargeVipBono(LessonUser $enrollment, Lesson $lesson, int $participantTotalAfter): array
    {
        $bono = UserBono::query()
            ->where('user_id', $enrollment->user_id)
            ->where('status', UserBono::STATUS_CONFIRMED)
            ->where('clases_restantes', '>', 0)
            ->orderByDesc('id')
            ->lockForUpdate()
            ->first();

        if ($bono === null) {
            return ['ok' => false, 'message' => 'El alumno no tiene saldo de bono VIP para confirmar esta plaza.'];
        }

        $units = LessonBonoCreditUnits::unitsForCharge($lesson->modality, $participantTotalAfter);
        if ((int) $bono->clases_restantes < $units) {
            return ['ok' => false, 'message' => 'Saldo de bono insuficiente para confirmar esta plaza.'];
        }

        $bono->decrement('clases_restantes', $units);

        BonoConsumption::query()->create([
            'user_bono_id' => $bono->id,
            'user_id' => $enrollment->user_id,
            'lesson_id' => $lesson->id,
            'remaining_after' => (int) $bono->fresh()->clases_restantes,
            'consumed_at' => BusinessDateTime::now(),
        ]);

        return ['ok' => true, 'message' => ''];
    }
}
