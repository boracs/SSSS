<?php

declare(strict_types=1);

namespace App\Actions\Academy;

use App\Enums\PaymentStatus;
use App\Events\PrivateLessonRequestedEvent;
use App\Http\Requests\Academy\RequestPrivateLessonRequest;
use App\Models\Lesson;
use App\Models\LessonUser;
use App\Models\User;
use App\Services\AvailabilityService;
use Illuminate\Support\Facades\DB;

final class RequestPrivateLessonAction
{
    public function __construct(
        private readonly AvailabilityService $availabilityService,
    ) {}

    /**
     * @return array{ok: bool, message: string, enrollment?: LessonUser, lesson?: Lesson}
     */
    public function execute(?User $user, RequestPrivateLessonRequest $request): array
    {
        $startsAt = $request->slotStartsAt();
        $endsAt = $request->slotEndsAt();

        $participants = $request->participants();
        $lead = $participants[0] ?? null;

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
        ) {
            // Cupo/monitor: sigue siendo 1 plaza de particular (señal actual).
            // TODO: si se tarifan N personas, ajustar evaluate/party_size/precio; ahora solo se guardan en notes.
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
                'admin_notes' => $participantNotes,
            ]);

            PrivateLessonRequestedEvent::dispatch($enrollment->fresh());

            return [
                'ok' => true,
                'enrollment' => $enrollment,
                'lesson' => $lesson,
                'message' => 'Clase particular registrada. Completando pago…',
            ];
        });
    }
}
