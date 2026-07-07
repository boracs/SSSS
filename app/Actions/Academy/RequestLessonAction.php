<?php

declare(strict_types=1);

namespace App\Actions\Academy;

use App\Enums\PaymentStatus;
use App\Events\LessonRequestedEvent;
use App\Models\Lesson;
use App\Models\LessonUser;
use App\Models\User;
use App\Services\AvailabilityService;
use App\Support\AcademyEnrollmentPolicy;
use App\Support\BusinessDateTime;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;

final class RequestLessonAction
{
    public function __construct(
        private readonly AvailabilityService $availabilityService,
    ) {}

    /**
     * @return array{ok: bool, message: string, extra_monitor_offer?: bool}
     */
    public function execute(
        User $user,
        Lesson $lesson,
        int $partySize,
        bool $requestExtraMonitor,
        ?string $ageBracket,
        UploadedFile $proof,
        ?string $paymentMethod,
    ): array {
        if ($lesson->status !== Lesson::STATUS_SCHEDULED) {
            return ['ok' => false, 'message' => 'Esta clase no admite nuevas solicitudes.'];
        }

        if (! AcademyEnrollmentPolicy::canEnrollByTime($lesson)) {
            return ['ok' => false, 'message' => AcademyEnrollmentPolicy::enrollBlockedMessage()];
        }

        if (LessonUser::query()
            ->where('lesson_id', $lesson->id)
            ->where('user_id', $user->id)
            ->whereIn('status', [
                LessonUser::STATUS_PENDING,
                LessonUser::STATUS_PENDING_EXTRA_MONITOR,
                LessonUser::STATUS_CONFIRMED,
                LessonUser::STATUS_ENROLLED,
                LessonUser::STATUS_ATTENDED,
            ])
            ->exists()) {
            return ['ok' => false, 'message' => 'Ya tienes una solicitud o plaza activa en esta clase.'];
        }

        $partySize = max(1, $partySize);

        $result = DB::transaction(function () use ($user, $lesson, $partySize, $requestExtraMonitor, $ageBracket, $proof, $paymentMethod) {
            return $this->availabilityService->withLockedLesson((int) $lesson->id, function (Lesson $locked) use ($user, $partySize, $requestExtraMonitor, $ageBracket, $proof, $paymentMethod) {
                if (! $locked->starts_at || ! $locked->ends_at) {
                    return ['ok' => false, 'message' => 'La clase no tiene horario válido.'];
                }

                $blockingStatuses = $this->availabilityService->occupancyStatuses();
                $blockingParty = (int) LessonUser::query()
                    ->where('lesson_id', $locked->id)
                    ->whereIn('status', $blockingStatuses)
                    ->sum(DB::raw('COALESCE(quantity, party_size, 1)'));

                $seatStatuses = [
                    LessonUser::STATUS_PENDING,
                    LessonUser::STATUS_PENDING_EXTRA_MONITOR,
                    LessonUser::STATUS_CONFIRMED,
                    LessonUser::STATUS_ENROLLED,
                    LessonUser::STATUS_ATTENDED,
                ];
                $seatsTaken = (int) LessonUser::query()
                    ->where('lesson_id', $locked->id)
                    ->whereIn('status', $seatStatuses)
                    ->sum(DB::raw('COALESCE(quantity, party_size, 1)'));

                $maxSlots = (int) ($locked->max_slots ?? 0);
                if ($partySize > 0 && $seatsTaken + $partySize > $maxSlots && $maxSlots > 0) {
                    return ['ok' => false, 'message' => 'No hay plazas libres en esta clase.'];
                }

                if (AcademyEnrollmentPolicy::requiresAdminQuotaApproval($seatsTaken, $partySize)) {
                    $enrollment = LessonUser::query()->create([
                        'lesson_id' => $locked->id,
                        'user_id' => $user->id,
                        'party_size' => $partySize,
                        'quantity' => $partySize,
                        'age_bracket' => $ageBracket,
                        'credits_locked' => 0,
                        'status' => LessonUser::STATUS_PENDING_EXTRA_MONITOR,
                        'payment_status' => PaymentStatus::Pending->value,
                        'payment_method' => $paymentMethod,
                    ]);

                    $path = $proof->store('lesson-proofs/'.$enrollment->id, 'local');
                    $enrollment->update([
                        'payment_proof_path' => $path,
                        'proof_uploaded_at' => BusinessDateTime::now(),
                    ]);

                    LessonRequestedEvent::dispatch($enrollment->fresh());

                    return [
                        'ok' => true,
                        'pending_admin' => true,
                        'message' => AcademyEnrollmentPolicy::quotaPendingMessage(),
                    ];
                }

                $participantTotalAfter = $blockingParty + $partySize;
                $evaluation = $this->availabilityService->evaluate(
                    $locked->starts_at,
                    $locked->ends_at,
                    $participantTotalAfter,
                    (int) $locked->id
                );

                if (! $evaluation['allowed']) {
                    $payload = [
                        'ok' => false,
                        'message' => $this->availabilityService->buildConflictMessage($evaluation),
                    ];
                    if (! $requestExtraMonitor) {
                        $payload['extra_monitor_offer'] = true;
                    }

                    return $payload;
                }

                $status = $requestExtraMonitor
                    ? LessonUser::STATUS_PENDING_EXTRA_MONITOR
                    : LessonUser::STATUS_PENDING;

                $enrollment = LessonUser::query()->create([
                    'lesson_id' => $locked->id,
                    'user_id' => $user->id,
                    'party_size' => $partySize,
                    'quantity' => $partySize,
                    'age_bracket' => $ageBracket,
                    'credits_locked' => 0,
                    'status' => $status,
                    'payment_status' => PaymentStatus::Pending->value,
                    'payment_method' => $paymentMethod,
                ]);

                $path = $proof->store('lesson-proofs/'.$enrollment->id, 'local');
                $enrollment->update([
                    'payment_proof_path' => $path,
                    'proof_uploaded_at' => BusinessDateTime::now(),
                ]);

                LessonRequestedEvent::dispatch($enrollment->fresh());

                return ['ok' => true, 'message' => 'Solicitud enviada. Revisaremos tu comprobante pronto.'];
            });
        });

        return $result;
    }
}
