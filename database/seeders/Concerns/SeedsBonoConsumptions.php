<?php

declare(strict_types=1);

namespace Database\Seeders\Concerns;

use App\Models\BonoConsumption;
use App\Models\CreditTransaction;
use App\Models\Lesson;
use App\Models\LessonUser;
use App\Models\PackBono;
use App\Models\StaffAssignment;
use App\Models\User;
use App\Models\UserBono;
use App\Support\LessonBonoCreditUnits;
use Illuminate\Support\Carbon;

/**
 * Logica compartida para sembrar consumos de bonos (clases VIP asistidas)
 * de forma idempotente y reutilizable entre seeders, evitando duplicar codigo.
 */
trait SeedsBonoConsumptions
{
    protected function resolveMonitor(): ?User
    {
        return User::query()->where('role', 'admin')->orderBy('id')->first()
            ?? User::query()->orderBy('id')->first();
    }

    protected function pickActivePack(?int $preferClases = null): ?PackBono
    {
        $base = PackBono::query()->where('activo', true);

        if ($preferClases !== null) {
            $exact = (clone $base)->where('num_clases', $preferClases)->first();
            if ($exact) {
                return $exact;
            }
        }

        return $base->orderBy('num_clases')->first();
    }

    /**
     * Crea (idempotente) una clase VIP historica asistida por el usuario.
     */
    protected function createAttendedVipLesson(
        User $user,
        User $monitor,
        string $title,
        Carbon $start,
        string $modality,
        ?string $monitorComment = null,
    ): Lesson {
        $isPrivate = $modality === Lesson::MODALITY_PARTICULAR;

        $lesson = Lesson::query()->firstOrCreate(
            ['title' => $title],
            [
                'description' => 'Clase VIP historica (seed).',
                'starts_at' => $start,
                'ends_at' => (clone $start)->addMinutes(90),
                'type' => Lesson::TYPE_SURF,
                'modality' => $modality,
                'level' => Lesson::LEVEL_INICIACION,
                'max_slots' => $isPrivate ? 1 : 8,
                'max_capacity' => $isPrivate ? 1 : 8,
                'price' => $isPrivate ? 85 : 35,
                'currency' => 'EUR',
                'location' => 'Playa Zurriola',
                'is_private' => $isPrivate,
                'is_surf_trip' => false,
                'is_optimal_waves' => false,
                'status' => Lesson::STATUS_COMPLETED,
            ]
        );

        StaffAssignment::query()->firstOrCreate([
            'lesson_id' => $lesson->id,
            'user_id' => $monitor->id,
            'role' => StaffAssignment::ROLE_MONITOR,
        ]);

        LessonUser::query()->firstOrCreate(
            ['lesson_id' => $lesson->id, 'user_id' => $user->id],
            [
                'party_size' => 1,
                'quantity' => 1,
                'credits_locked' => LessonBonoCreditUnits::unitsFromModality($modality),
                'status' => LessonUser::STATUS_ATTENDED,
                'payment_status' => LessonUser::PAYMENT_CONFIRMED,
                'confirmed_at' => (clone $start)->subDay(),
                'admin_notes' => $monitorComment,
            ]
        );

        return $lesson;
    }

    /**
     * Crea un UserBono confirmado y consume $consumeCredits creditos generando
     * clases VIP asistidas con su historial. Idempotente por $marker.
     */
    protected function seedConfirmedBono(
        User $user,
        User $monitor,
        PackBono $pack,
        int $consumeCredits,
        string $marker,
        Carbon $purchasedAt,
    ): UserBono {
        $total = (int) $pack->num_clases;
        $consumeCredits = max(0, min($consumeCredits, $total));

        $bono = UserBono::query()->firstOrCreate(
            ['user_id' => $user->id, 'admin_notes' => $marker],
            [
                'pack_id' => $pack->id,
                'clases_restantes' => $total,
                'status' => UserBono::STATUS_CONFIRMED,
            ]
        );

        CreditTransaction::query()->firstOrCreate(
            [
                'user_id' => $user->id,
                'type' => CreditTransaction::TYPE_PURCHASE,
                'description' => 'Compra '.$marker,
            ],
            ['amount' => $total]
        );

        $remaining = $total;
        $pending = $consumeCredits;
        $i = 0;

        while ($pending > 0 && $i < 60) {
            // Cada 4a clase es particular (2 creditos) si caben; el resto grupal (1).
            $modality = ($pending >= 2 && $i % 4 === 3)
                ? Lesson::MODALITY_PARTICULAR
                : Lesson::MODALITY_GRUPAL;
            $credits = LessonBonoCreditUnits::unitsFromModality($modality);
            if ($credits > $pending) {
                $modality = Lesson::MODALITY_GRUPAL;
                $credits = 1;
            }

            $start = $purchasedAt->copy()->addDays(3 + $i * 4)->setTime(10 + ($i % 6), 0);
            $title = sprintf('VIP-SEED u%d %s #%d', $user->id, $marker, $i + 1);

            $lesson = $this->createAttendedVipLesson($user, $monitor, $title, $start, $modality);

            $remaining = max(0, $remaining - $credits);

            BonoConsumption::query()->firstOrCreate(
                ['user_bono_id' => $bono->id, 'lesson_id' => $lesson->id],
                [
                    'user_id' => $user->id,
                    'remaining_after' => $remaining,
                    'consumed_at' => $start->copy()->addHour(),
                ]
            );

            CreditTransaction::query()->firstOrCreate(
                [
                    'user_id' => $user->id,
                    'lesson_id' => $lesson->id,
                    'type' => CreditTransaction::TYPE_LESSON_CHARGE,
                ],
                [
                    'amount' => -$credits,
                    'description' => $marker.' charge '.$lesson->id,
                ]
            );

            $pending -= $credits;
            $i++;
        }

        $bono->update(['clases_restantes' => $remaining]);

        return $bono;
    }
}
