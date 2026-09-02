<?php

declare(strict_types=1);

namespace App\Actions\Academy;

use App\Enums\PaymentStatus;
use App\Models\BonoConsumption;
use App\Models\Lesson;
use App\Models\LessonUser;
use App\Models\User;
use App\Services\AvailabilityService;
use App\Services\BonoService;
use App\Support\AcademyEnrollmentPolicy;
use App\Support\BusinessDateTime;
use App\Support\LessonBonoCreditUnits;
use Illuminate\Support\Facades\DB;

final class EnrollStudentAction
{
    public function __construct(
        private readonly AvailabilityService $availabilityService,
        private readonly BonoService $bonoService,
    ) {}

    /**
     * @return array{ok: bool, message: string, pending_admin?: bool}
     */
    public function execute(User $user, Lesson $lesson): array
    {
        if (! (bool) ($user->is_vip ?? false)) {
            return ['ok' => false, 'message' => 'La inscripción directa con bono solo está disponible para alumnos VIP.'];
        }

        if ($lesson->starts_at && $lesson->starts_at->lt(BusinessDateTime::now())) {
            return ['ok' => false, 'message' => 'Esta clase ya ha pasado.'];
        }

        if (! AcademyEnrollmentPolicy::canEnrollByTime($lesson)) {
            return ['ok' => false, 'message' => AcademyEnrollmentPolicy::enrollBlockedMessage()];
        }

        return DB::transaction(function () use ($user, $lesson) {
            return $this->availabilityService->withLockedLesson((int) $lesson->id, function (Lesson $locked) use ($user) {
                if (! $locked->starts_at || ! $locked->ends_at) {
                    return ['ok' => false, 'message' => 'La clase no tiene horario válido.'];
                }

                if ($locked->status !== Lesson::STATUS_SCHEDULED) {
                    return ['ok' => false, 'message' => 'Esta clase no admite inscripciones.'];
                }

                $seatStatuses = LessonUser::activeSeatStatuses();

                // Con la lección ya bloqueada: comprobación e INSERT comparten
                // la sección serializada, así el doble clic no duplica la fila.
                if (LessonUser::query()
                    ->where('lesson_id', $locked->id)
                    ->where('user_id', $user->id)
                    ->whereIn('status', $seatStatuses)
                    ->exists()) {
                    return ['ok' => false, 'message' => 'Ya estás inscrito o tienes una solicitud activa en esta clase.'];
                }

                $seatsTaken = (int) LessonUser::query()
                    ->where('lesson_id', $locked->id)
                    ->whereIn('status', $seatStatuses)
                    ->sum(DB::raw('COALESCE(quantity, party_size, 1)'));

                $partySize = 1;
                $maxSlots = (int) ($locked->max_slots ?? 0);

                if ($maxSlots > 0 && $seatsTaken + $partySize > $maxSlots) {
                    return ['ok' => false, 'message' => 'No hay plazas libres en esta clase.'];
                }

                if (AcademyEnrollmentPolicy::requiresAdminQuotaApproval($seatsTaken, $partySize)) {
                    LessonUser::query()->create([
                        'lesson_id' => $locked->id,
                        'user_id' => $user->id,
                        'party_size' => 1,
                        'quantity' => 1,
                        'credits_locked' => 0,
                        'status' => LessonUser::STATUS_PENDING_EXTRA_MONITOR,
                        'payment_status' => PaymentStatus::Pending->value,
                        'payment_method' => 'bono_vip',
                    ]);

                    return [
                        'ok' => true,
                        'pending_admin' => true,
                        'message' => AcademyEnrollmentPolicy::quotaPendingMessage(),
                    ];
                }

                $blockingStatuses = $this->availabilityService->occupancyStatuses();
                $blockingParty = (int) LessonUser::query()
                    ->where('lesson_id', $locked->id)
                    ->whereIn('status', $blockingStatuses)
                    ->sum(DB::raw('COALESCE(quantity, party_size, 1)'));

                $participantTotalAfter = $blockingParty + $partySize;

                $evaluation = $this->availabilityService->evaluate(
                    $locked->starts_at,
                    $locked->ends_at,
                    $participantTotalAfter,
                    (int) $locked->id
                );

                if (! $evaluation['allowed']) {
                    return [
                        'ok' => false,
                        'message' => $this->availabilityService->buildConflictMessage($evaluation),
                    ];
                }

                $bonoLocked = $this->bonoService->lockFifoBono((int) $user->id);

                if ($bonoLocked === null) {
                    return ['ok' => false, 'message' => 'No tienes saldo de bono VIP disponible.'];
                }

                $uc = LessonBonoCreditUnits::unitsForCharge($locked->modality, $participantTotalAfter);
                if ((int) $bonoLocked->clases_restantes < $uc) {
                    return ['ok' => false, 'message' => 'No tienes créditos suficientes en el bono para esta clase.'];
                }

                LessonUser::query()->create([
                    'lesson_id' => $locked->id,
                    'user_id' => $user->id,
                    'party_size' => 1,
                    'quantity' => 1,
                    'credits_locked' => 0,
                    'status' => LessonUser::STATUS_ENROLLED,
                    'payment_status' => PaymentStatus::Confirmed->value,
                    'payment_method' => 'bono_vip',
                    'confirmed_at' => BusinessDateTime::now(),
                ]);

                $bonoLocked->decrement('clases_restantes', $uc);

                BonoConsumption::query()->create([
                    'user_bono_id' => $bonoLocked->id,
                    'user_id' => $user->id,
                    'lesson_id' => $locked->id,
                    'remaining_after' => (int) $bonoLocked->fresh()->clases_restantes,
                    'units_consumed' => $uc,
                    'consumed_at' => BusinessDateTime::now(),
                ]);

                return ['ok' => true, 'message' => 'Te has inscrito en la clase usando tu bono VIP.'];
            });
        });
    }
}
