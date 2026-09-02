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
use Illuminate\Support\Facades\DB;

final class RequestLessonAction
{
    public function __construct(
        private readonly AvailabilityService $availabilityService,
    ) {}

    /**
     * Crea la inscripción en estado pending y devuelve el enrollment para que
     * el controlador pueda iniciar la sesión de Stripe Checkout.
     *
     * Guest (sin cuenta): solo modalidad grupal abierta — nunca VIP ni semanal.
     *
     * @param  list<array{first_name: string, last_name: string}>  $participants
     * @return array{ok: bool, message: string, extra_monitor_offer?: bool, enrollment?: LessonUser, pending_admin?: bool}
     */
    public function execute(
        ?User $user,
        Lesson $lesson,
        int $partySize,
        bool $requestExtraMonitor,
        ?string $ageBracket,
        array $participants = [],
        ?string $guestEmail = null,
        ?string $guestPhone = null,
    ): array {
        if ($lesson->status !== Lesson::STATUS_SCHEDULED) {
            return ['ok' => false, 'message' => 'Esta clase no admite nuevas solicitudes.'];
        }

        $modality = (string) ($lesson->modality ?: ((bool) ($lesson->is_private ?? false)
            ? Lesson::MODALITY_PARTICULAR
            : (($lesson->type ?? '') === 'weekly' ? Lesson::MODALITY_SEMANAL : Lesson::MODALITY_GRUPAL)));

        if ($user === null) {
            if ($modality !== Lesson::MODALITY_GRUPAL) {
                return [
                    'ok' => false,
                    'message' => 'Sin cuenta solo puedes apuntarte a clases grupales abiertas. Inicia sesión para semanal o VIP.',
                ];
            }
            if ($guestEmail === null || $guestPhone === null) {
                return ['ok' => false, 'message' => 'Indica email y teléfono para reservar sin cuenta.'];
            }
        }

        if (! AcademyEnrollmentPolicy::canEnrollByTime($lesson)) {
            return ['ok' => false, 'message' => AcademyEnrollmentPolicy::enrollBlockedMessage()];
        }

        $partySize = max(1, $partySize);
        $guestFirst = $participants[0]['first_name'] ?? null;
        $guestLast = $participants[0]['last_name'] ?? null;

        $result = DB::transaction(function () use (
            $user,
            $lesson,
            $partySize,
            $requestExtraMonitor,
            $ageBracket,
            $participants,
            $guestEmail,
            $guestPhone,
            $guestFirst,
            $guestLast,
        ) {
            return $this->availabilityService->withLockedLesson(
                (int) $lesson->id,
                function (Lesson $locked) use (
                    $user,
                    $partySize,
                    $requestExtraMonitor,
                    $ageBracket,
                    $participants,
                    $guestEmail,
                    $guestPhone,
                    $guestFirst,
                    $guestLast,
                ) {
                    if (! $locked->starts_at || ! $locked->ends_at) {
                        return ['ok' => false, 'message' => 'La clase no tiene horario válido.'];
                    }

                    // Con la lección ya bloqueada: comprobación e INSERT comparten
                    // la sección serializada, así el doble clic no duplica la fila.
                    $duplicate = $this->activeEnrollmentExists($locked, $user, $guestEmail);
                    if ($duplicate !== null) {
                        return ['ok' => false, 'message' => $duplicate];
                    }

                    $blockingStatuses = $this->availabilityService->occupancyStatuses();
                    $blockingParty = (int) LessonUser::query()
                        ->where('lesson_id', $locked->id)
                        ->whereIn('status', $blockingStatuses)
                        ->sum(DB::raw('COALESCE(quantity, party_size, 1)'));

                    $seatStatuses = LessonUser::activeSeatStatuses();
                    $seatsTaken = (int) LessonUser::query()
                        ->where('lesson_id', $locked->id)
                        ->whereIn('status', $seatStatuses)
                        ->sum(DB::raw('COALESCE(quantity, party_size, 1)'));

                    $maxSlots = (int) ($locked->max_slots ?? 0);
                    if ($partySize > 0 && $seatsTaken + $partySize > $maxSlots && $maxSlots > 0) {
                        return ['ok' => false, 'message' => 'No hay plazas libres en esta clase.'];
                    }

                    $participantNotes = $participants !== []
                        ? json_encode(
                            ['type' => 'group_booking', 'participants' => $participants],
                            JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR,
                        )
                        : null;

                    $baseEnrollment = [
                        'lesson_id' => $locked->id,
                        'user_id' => $user?->id,
                        'guest_first_name' => $user ? null : $guestFirst,
                        'guest_last_name' => $user ? null : $guestLast,
                        'guest_email' => $user ? null : $guestEmail,
                        'guest_phone' => $user ? null : $guestPhone,
                        'is_admin_guest' => false,
                        'party_size' => $partySize,
                        'quantity' => $partySize,
                        'age_bracket' => $ageBracket,
                        'credits_locked' => 0,
                        'payment_status' => PaymentStatus::Pending->value,
                        'payment_method' => 'card',
                        'admin_notes' => $participantNotes,
                    ];

                    // Necesita aprobación de admin por cupo extra
                    if (AcademyEnrollmentPolicy::requiresAdminQuotaApproval($seatsTaken, $partySize)) {
                        $enrollment = LessonUser::query()->create(array_merge($baseEnrollment, [
                            'status' => LessonUser::STATUS_PENDING_EXTRA_MONITOR,
                        ]));

                        LessonRequestedEvent::dispatch($enrollment->fresh());

                        return [
                            'ok' => true,
                            'pending_admin' => true,
                            'enrollment' => $enrollment,
                            'message' => AcademyEnrollmentPolicy::quotaPendingMessage(),
                        ];
                    }

                    $participantTotalAfter = $blockingParty + $partySize;
                    $evaluation = $this->availabilityService->evaluate(
                        $locked->starts_at,
                        $locked->ends_at,
                        $participantTotalAfter,
                        (int) $locked->id,
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

                    $enrollment = LessonUser::query()->create(array_merge($baseEnrollment, [
                        'status' => $status,
                    ]));

                    LessonRequestedEvent::dispatch($enrollment->fresh());

                    return [
                        'ok' => true,
                        'enrollment' => $enrollment,
                        'message' => 'Plaza reservada. Completando pago…',
                    ];
                }
            );
        });

        return $result;
    }

    /**
     * Mensaje de error si ya hay plaza o solicitud activa para ese socio o ese
     * email invitado; null si se puede inscribir. Replica la clave del índice
     * `lesson_user_active_enrollment_unique` (que ignora altas de mostrador).
     */
    private function activeEnrollmentExists(Lesson $lesson, ?User $user, ?string $guestEmail): ?string
    {
        $activeStatuses = LessonUser::activeSeatStatuses();

        if ($user !== null) {
            $exists = LessonUser::query()
                ->where('lesson_id', $lesson->id)
                ->where('user_id', $user->id)
                ->whereIn('status', $activeStatuses)
                ->exists();

            return $exists ? 'Ya tienes una solicitud o plaza activa en esta clase.' : null;
        }

        if ($guestEmail === null || trim($guestEmail) === '') {
            return null;
        }

        $exists = LessonUser::query()
            ->where('lesson_id', $lesson->id)
            ->whereNull('user_id')
            ->where('is_admin_guest', false)
            ->whereRaw('LOWER(guest_email) = ?', [mb_strtolower(trim($guestEmail))])
            ->whereIn('status', $activeStatuses)
            ->exists();

        return $exists ? 'Ya hay una solicitud activa con ese email en esta clase.' : null;
    }
}
