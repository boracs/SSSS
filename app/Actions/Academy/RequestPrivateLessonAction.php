<?php

declare(strict_types=1);

namespace App\Actions\Academy;

use App\DTOs\Academy\PrivateLessonQuoteDto;
use App\Enums\PaymentStatus;
use App\Events\PrivateLessonRequestedEvent;
use App\Http\Requests\Academy\RequestPrivateLessonRequest;
use App\Models\Lesson;
use App\Models\LessonUser;
use App\Models\User;
use App\Services\Academy\PrivateLessonPricingService;
use App\Services\AvailabilityService;
use App\Support\MoneyCents;
use Illuminate\Support\Facades\DB;

final class RequestPrivateLessonAction
{
    public function __construct(
        private readonly AvailabilityService $availabilityService,
        private readonly PrivateLessonPricingService $pricingService,
    ) {}

    /**
     * @return array{ok: bool, message: string, enrollment?: LessonUser, lesson?: Lesson, quote?: PrivateLessonQuoteDto}
     */
    public function execute(?User $user, RequestPrivateLessonRequest $request): array
    {
        $startsAt = $request->slotStartsAt();
        $endsAt = $request->slotEndsAt();

        $participants = $request->participants();
        $lead = $participants[0] ?? null;

        $quote = $this->pricingService->quote(
            people: max(1, count($participants)),
            durationMinutes: (int) $startsAt->diffInMinutes($endsAt),
        );

        if ($user) {
            $label = trim(($user->nombre ?? '').' '.($user->apellido ?? '')) ?: ('#'.$user->id);
            $guestFirst = null;
            $guestLast = null;
            $guestEmail = null;
            $guestPhone = null;
        } else {
            $guestFirst = (string) ($request->guestFirstName() ?: ($lead['first_name'] ?? ''));
            $guestLast = (string) ($request->guestLastName() ?: ($lead['last_name'] ?? ''));
            $guestEmail = $request->guestEmail();
            $guestPhone = $request->guestPhone();
            $label = trim($guestFirst.' '.$guestLast) ?: 'Invitado';
        }

        return DB::transaction(function () use (
            $user,
            $startsAt,
            $endsAt,
            $label,
            $guestFirst,
            $guestLast,
            $guestEmail,
            $guestPhone,
            $participants,
            $quote,
        ) {
            $duplicate = $this->activePrivateRequestExists($user, $guestEmail, $startsAt, $endsAt);
            if ($duplicate !== null) {
                return ['ok' => false, 'message' => $duplicate];
            }

            // Serializa el evaluate+create frente a otras particulares de la
            // misma franja. Dos solapadas siguen permitidas (pool de 2 monitores).
            Lesson::query()
                ->where('modality', Lesson::MODALITY_PARTICULAR)
                ->where('status', Lesson::STATUS_SCHEDULED)
                ->where('starts_at', '<', $endsAt)
                ->where('ends_at', '>', $startsAt)
                ->orderBy('id')
                ->lockForUpdate()
                ->get(['id']);

            // Cupo/monitor: la particular ocupa 1 plaza de agenda (un monitor
            // atiende al grupo); el nº de personas solo afecta a la tarifa.
            $evaluation = $this->availabilityService->evaluate($startsAt, $endsAt, 1, 0);
            if (! $evaluation['allowed']) {
                return ['ok' => false, 'message' => $this->availabilityService->buildConflictMessage($evaluation)];
            }

            $lesson = Lesson::query()->create([
                'title' => 'Particular · '.$label.' · '.$startsAt->format('d/m/Y H:i'),
                'starts_at' => $startsAt,
                'ends_at' => $endsAt,
                'type' => Lesson::TYPE_SURF,
                'modality' => Lesson::MODALITY_PARTICULAR,
                'level' => Lesson::LEVEL_INICIACION,
                'max_slots' => 1,
                'status' => Lesson::STATUS_SCHEDULED,
                'is_private' => true,
                'price' => MoneyCents::centsToEuros($quote->totalCents),
            ]);

            $participantNotes = $participants !== []
                ? json_encode(
                    ['type' => 'private_booking', 'participants' => $participants],
                    JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR,
                )
                : null;

            $enrollment = LessonUser::query()->create([
                'lesson_id' => $lesson->id,
                'user_id' => $user?->id,
                'guest_first_name' => $guestFirst,
                'guest_last_name' => $guestLast,
                'guest_email' => $guestEmail,
                'guest_phone' => $guestPhone,
                'is_admin_guest' => false,
                'party_size' => 1,
                'quantity' => 1,
                'credits_locked' => 0,
                'status' => LessonUser::STATUS_PENDING,
                'payment_status' => PaymentStatus::Pending->value,
                'payment_method' => 'card',
                'deposit_amount_cents' => $quote->depositCents,
                'admin_notes' => $participantNotes,
            ]);

            PrivateLessonRequestedEvent::dispatch($enrollment->fresh());

            return [
                'ok' => true,
                'enrollment' => $enrollment,
                'lesson' => $lesson,
                'quote' => $quote,
                'message' => 'Clase particular registrada. Completando pago…',
            ];
        });
    }

    /**
     * Mismo criterio que RequestLessonAction::activeEnrollmentExists, pero
     * la particular crea la Lesson: la clave es socio/email + franja.
     */
    private function activePrivateRequestExists(
        ?User $user,
        ?string $guestEmail,
        $startsAt,
        $endsAt,
    ): ?string {
        $activeStatuses = LessonUser::activeSeatStatuses();

        $query = LessonUser::query()
            ->whereIn('status', $activeStatuses)
            ->whereHas('lesson', function ($lessons) use ($startsAt, $endsAt): void {
                $lessons->where('modality', Lesson::MODALITY_PARTICULAR)
                    ->where('status', Lesson::STATUS_SCHEDULED)
                    ->where('starts_at', $startsAt)
                    ->where('ends_at', $endsAt);
            });

        if ($user !== null) {
            $exists = (clone $query)->where('user_id', $user->id)->exists();

            return $exists ? 'Ya tienes una solicitud o plaza activa en esta franja.' : null;
        }

        if ($guestEmail === null || trim($guestEmail) === '') {
            return null;
        }

        $exists = $query
            ->whereNull('user_id')
            ->where('is_admin_guest', false)
            ->whereRaw('LOWER(guest_email) = ?', [mb_strtolower(trim($guestEmail))])
            ->exists();

        return $exists ? 'Ya hay una solicitud activa con ese email en esta franja.' : null;
    }
}
