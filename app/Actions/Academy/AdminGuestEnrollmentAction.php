<?php

declare(strict_types=1);

namespace App\Actions\Academy;

use App\DTOs\Academy\AdminGuestEnrollmentDto;
use App\Models\Lesson;
use App\Models\LessonUser;
use App\Services\AvailabilityService;
use App\Support\BusinessDateTime;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class AdminGuestEnrollmentAction
{
    private const ACADEMY_MODALITIES = [
        Lesson::MODALITY_GRUPAL,
        Lesson::MODALITY_SEMANAL,
        Lesson::MODALITY_PARTICULAR,
    ];

    public function __construct(
        private readonly AvailabilityService $availabilityService
    ) {}

    public function add(Lesson $lesson, AdminGuestEnrollmentDto $dto): LessonUser
    {
        $this->assertGuestData($dto);

        return DB::transaction(function () use ($lesson, $dto) {
            $locked = Lesson::query()->whereKey($lesson->id)->lockForUpdate()->firstOrFail();
            $this->assertAcademyModality($locked);
            $this->assertCapacityForIncoming($locked, 1);

            return $this->createGuestEnrollment($locked, $dto);
        });
    }

    public function update(LessonUser $enrollment, AdminGuestEnrollmentDto $dto): LessonUser
    {
        $this->assertAdminGuest($enrollment);
        $this->assertGuestData($dto);

        return DB::transaction(function () use ($enrollment, $dto) {
            $locked = LessonUser::query()->whereKey($enrollment->id)->lockForUpdate()->firstOrFail();
            $this->assertAdminGuest($locked);

            $locked->update([
                'guest_first_name' => $dto->firstName,
                'guest_last_name' => $dto->lastName,
                'guest_phone' => $dto->phone,
                'guest_email' => $dto->email,
                'payment_status' => $dto->paymentConfirmed
                    ? LessonUser::PAYMENT_CONFIRMED
                    : LessonUser::PAYMENT_PENDING,
                'payment_method' => $dto->paymentMethod,
                'confirmed_at' => $dto->paymentConfirmed
                    ? ($locked->confirmed_at ?? BusinessDateTime::now())
                    : null,
            ]);

            return $locked->fresh();
        });
    }

    public function remove(LessonUser $enrollment): void
    {
        $this->assertAdminGuest($enrollment);

        DB::transaction(function () use ($enrollment) {
            $locked = LessonUser::query()->whereKey($enrollment->id)->lockForUpdate()->firstOrFail();
            $this->assertAdminGuest($locked);
            $locked->update([
                'status' => LessonUser::STATUS_CANCELLED,
                'cancelled_at' => BusinessDateTime::now(),
            ]);
        });
    }

    public function setPaymentStatus(LessonUser $enrollment, string $paymentStatus): LessonUser
    {
        if (! in_array($paymentStatus, [
            LessonUser::PAYMENT_PENDING,
            LessonUser::PAYMENT_CONFIRMED,
            LessonUser::PAYMENT_REJECTED,
        ], true)) {
            throw new InvalidArgumentException('Estado de pago no válido.');
        }

        $this->assertAdminGuest($enrollment);

        return DB::transaction(function () use ($enrollment, $paymentStatus) {
            $locked = LessonUser::query()->whereKey($enrollment->id)->lockForUpdate()->firstOrFail();
            $this->assertAdminGuest($locked);

            if (
                $paymentStatus === LessonUser::PAYMENT_CONFIRMED
                && $locked->status === LessonUser::STATUS_CANCELLED
            ) {
                $lesson = Lesson::query()->whereKey($locked->lesson_id)->lockForUpdate()->firstOrFail();
                $this->assertAcademyModality($lesson);
                $this->assertCapacityForIncoming($lesson, 1, (int) $locked->id);
                $locked->status = LessonUser::STATUS_ENROLLED;
                $locked->cancelled_at = null;
            }

            $locked->payment_status = $paymentStatus;
            if ($paymentStatus === LessonUser::PAYMENT_CONFIRMED) {
                $locked->confirmed_at = $locked->confirmed_at ?? BusinessDateTime::now();
            }
            $locked->save();

            return $locked->fresh();
        });
    }

    /**
     * @param  list<AdminGuestEnrollmentDto>  $participants
     */
    public function syncBookerAndParticipants(Lesson $lesson, ?string $bookerFirst, ?string $bookerLast, ?string $bookerPhone, array $participants): void
    {
        DB::transaction(function () use ($lesson, $bookerFirst, $bookerLast, $bookerPhone, $participants) {
            $locked = Lesson::query()->whereKey($lesson->id)->lockForUpdate()->firstOrFail();
            $this->assertAcademyModality($locked);

            $locked->update([
                'booker_first_name' => $bookerFirst,
                'booker_last_name' => $bookerLast,
                'booker_phone' => $bookerPhone,
            ]);

            if ($participants === []) {
                return;
            }

            $this->assertCapacityForIncoming($locked, count($participants));

            foreach ($participants as $dto) {
                $this->assertGuestData($dto);
                $this->createGuestEnrollment($locked, $dto);
            }
        });
    }

    private function createGuestEnrollment(Lesson $lesson, AdminGuestEnrollmentDto $dto): LessonUser
    {
        return LessonUser::query()->create([
            'lesson_id' => (int) $lesson->id,
            'user_id' => null,
            'is_admin_guest' => true,
            'guest_first_name' => $dto->firstName,
            'guest_last_name' => $dto->lastName,
            'guest_phone' => $dto->phone,
            'guest_email' => $dto->email,
            'party_size' => 1,
            'quantity' => 1,
            'status' => LessonUser::STATUS_ENROLLED,
            'payment_status' => $dto->paymentConfirmed
                ? LessonUser::PAYMENT_CONFIRMED
                : LessonUser::PAYMENT_PENDING,
            'payment_method' => $dto->paymentMethod,
            'confirmed_at' => $dto->paymentConfirmed ? BusinessDateTime::now() : null,
            'admin_notes' => '[admin_walkin]',
        ]);
    }

    private function assertGuestData(AdminGuestEnrollmentDto $dto): void
    {
        if ($dto->firstName === '' || $dto->lastName === '') {
            throw new InvalidArgumentException('Nombre y apellidos son obligatorios.');
        }
    }

    private function assertAdminGuest(LessonUser $enrollment): void
    {
        if (! $enrollment->is_admin_guest) {
            throw new InvalidArgumentException('Solo se pueden gestionar inscripciones creadas por administración.');
        }
    }

    private function assertAcademyModality(Lesson $lesson): void
    {
        $modality = (string) ($lesson->modality ?: ($lesson->is_private ? Lesson::MODALITY_PARTICULAR : Lesson::MODALITY_GRUPAL));
        if (! in_array($modality, self::ACADEMY_MODALITIES, true)) {
            throw new InvalidArgumentException('Las inscripciones manuales solo aplican a clases grupales, semanales o particulares.');
        }
    }

    private function assertCapacityForIncoming(Lesson $lesson, int $incoming, int $excludeEnrollmentId = 0): void
    {
        $blockingStatuses = $this->availabilityService->occupancyStatuses();
        $alreadyBooked = (int) LessonUser::query()
            ->where('lesson_id', $lesson->id)
            ->when($excludeEnrollmentId > 0, fn ($q) => $q->where('id', '!=', $excludeEnrollmentId))
            ->whereIn('status', $blockingStatuses)
            ->sum(DB::raw('COALESCE(quantity, party_size, 1)'));

        $projectedPartySize = $alreadyBooked + max(1, $incoming);
        $evaluation = $this->availabilityService->evaluate(
            $lesson->starts_at,
            $lesson->ends_at,
            $projectedPartySize,
            (int) $lesson->id
        );

        if (! $evaluation['allowed']) {
            throw new InvalidArgumentException($this->availabilityService->buildConflictMessage($evaluation));
        }

        $maxSlots = (int) ($lesson->max_slots ?? $lesson->max_capacity ?? 6);
        if (($alreadyBooked + $incoming) > $maxSlots) {
            throw new InvalidArgumentException("No hay plazas suficientes ({$alreadyBooked}/{$maxSlots} ocupadas).");
        }
    }
}
