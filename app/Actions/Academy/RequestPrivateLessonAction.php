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
use App\Support\BusinessDateTime;
use Illuminate\Support\Facades\DB;

final class RequestPrivateLessonAction
{
    public function __construct(
        private readonly AvailabilityService $availabilityService,
    ) {}

    /**
     * @return array{ok: bool, message: string}
     */
    public function execute(User $user, RequestPrivateLessonRequest $request): array
    {
        $startsAt = $request->slotStartsAt();
        $endsAt = $request->slotEndsAt();
        $paymentMethod = $request->paymentMethod();
        $proof = $request->proofFile();

        $label = trim(($user->nombre ?? '').' '.($user->apellido ?? '')) ?: ('#'.$user->id);

        return DB::transaction(function () use ($user, $startsAt, $endsAt, $proof, $paymentMethod, $label) {
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

            $enrollment = LessonUser::query()->create([
                'lesson_id' => $lesson->id,
                'user_id' => $user->id,
                'party_size' => 1,
                'quantity' => 1,
                'credits_locked' => 0,
                'status' => LessonUser::STATUS_PENDING,
                'payment_status' => PaymentStatus::Pending->value,
                'payment_method' => $paymentMethod,
            ]);

            $path = $proof->store('lesson-proofs/'.$enrollment->id, 'local');
            $enrollment->update([
                'payment_proof_path' => $path,
                'proof_uploaded_at' => BusinessDateTime::now(),
            ]);

            PrivateLessonRequestedEvent::dispatch($enrollment->fresh());

            return ['ok' => true, 'message' => 'Solicitud de clase particular enviada.'];
        });
    }
}
