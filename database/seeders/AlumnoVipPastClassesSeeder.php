<?php

namespace Database\Seeders;

use App\Models\BonoConsumption;
use App\Support\LessonBonoCreditUnits;
use App\Models\CreditTransaction;
use App\Models\Lesson;
use App\Models\LessonUser;
use App\Models\PackBono;
use App\Models\StaffAssignment;
use App\Models\User;
use App\Models\UserBono;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Clases ya realizadas (asistidas) para el alumno VIP, consumiendo créditos de un bono VIP.
 * Idempotente por título de clase y consumos por (bono, lesson).
 */
class AlumnoVipPastClassesSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::query()->where('email', 'alumnovip@gmail.com')->first();
        if (! $user) {
            $this->command?->warn('No existe usuario alumnovip@gmail.com; se omite.');

            return;
        }

        $monitor = User::query()
            ->where('email', 'like', '%staff.superseed%@masquesurf.local')
            ->orderBy('id')
            ->first()
            ?? User::query()->where('role', 'admin')->orderBy('id')->first();

        if (! $monitor) {
            $this->command?->warn('No hay usuario staff/admin para asignación; se omite.');

            return;
        }

        DB::transaction(function () use ($user, $monitor) {
            $pack = PackBono::query()->firstOrCreate(
                ['nombre' => 'Bono VIP Histórico (seed alumnovip)'],
                [
                    'num_clases' => 30,
                    'precio' => 420,
                    'activo' => false,
                ]
            );

            $bono = UserBono::query()->firstOrCreate(
                [
                    'user_id' => $user->id,
                    'admin_notes' => 'Bono seed: VIP-HIST-alumnovip',
                ],
                [
                    'pack_id' => $pack->id,
                    'clases_restantes' => (int) $pack->num_clases,
                    'status' => UserBono::STATUS_CONFIRMED,
                    'payment_proof_path' => null,
                ]
            );

            if (! CreditTransaction::query()
                ->where('user_id', $user->id)
                ->where('type', CreditTransaction::TYPE_PURCHASE)
                ->where('description', 'like', '%VIP-HIST-alumnovip compra%')
                ->exists()) {
                CreditTransaction::query()->create([
                    'user_id' => $user->id,
                    'amount' => (int) $pack->num_clases,
                    'type' => CreditTransaction::TYPE_PURCHASE,
                    'description' => 'Compra bono VIP-HIST-alumnovip (seed).',
                ]);
            }

            $defs = [
                ['suffix' => 'Grupal 1', 'modality' => Lesson::MODALITY_GRUPAL, 'daysAgo' => 75, 'hour' => 10],
                ['suffix' => 'Grupal 2', 'modality' => Lesson::MODALITY_GRUPAL, 'daysAgo' => 62, 'hour' => 11],
                ['suffix' => 'Grupal 3', 'modality' => Lesson::MODALITY_GRUPAL, 'daysAgo' => 48, 'hour' => 9],
                ['suffix' => 'Particular 1', 'modality' => Lesson::MODALITY_PARTICULAR, 'daysAgo' => 40, 'hour' => 16],
                ['suffix' => 'Particular 2', 'modality' => Lesson::MODALITY_PARTICULAR, 'daysAgo' => 33, 'hour' => 17],
                ['suffix' => 'Semanal 1', 'modality' => Lesson::MODALITY_SEMANAL, 'daysAgo' => 28, 'hour' => 18],
                ['suffix' => 'Semanal 2', 'modality' => Lesson::MODALITY_SEMANAL, 'daysAgo' => 14, 'hour' => 10],
            ];

            $isParticular = static fn (string $m): bool => $m === Lesson::MODALITY_PARTICULAR;

            foreach ($defs as $def) {
                $title = 'VIP-HIST alumnovip · '.$def['suffix'];
                $start = Carbon::now()->subDays((int) $def['daysAgo'])->setTime((int) $def['hour'], 0);
                $end = (clone $start)->addMinutes(90);

                $lesson = Lesson::query()->firstOrCreate(
                    ['title' => $title],
                    [
                        'description' => 'Clase histórica (seed) — alumno VIP con bono.',
                        'starts_at' => $start,
                        'ends_at' => $end,
                        'type' => Lesson::TYPE_SURF,
                        'modality' => $def['modality'],
                        'batch_id' => null,
                        'level' => Lesson::LEVEL_INICIACION,
                        'max_slots' => $isParticular($def['modality']) ? 1 : 8,
                        'max_capacity' => $isParticular($def['modality']) ? 1 : 8,
                        'price' => $isParticular($def['modality']) ? 85 : 35,
                        'currency' => 'EUR',
                        'location' => 'Playa Zurriola',
                        'is_private' => $isParticular($def['modality']),
                        'is_surf_trip' => false,
                        'is_optimal_waves' => false,
                        'status' => Lesson::STATUS_COMPLETED,
                    ]
                );

                if ($lesson->wasRecentlyCreated || $lesson->status !== Lesson::STATUS_COMPLETED) {
                    $lesson->update([
                        'starts_at' => $start,
                        'ends_at' => $end,
                        'modality' => $def['modality'],
                        'is_private' => $isParticular($def['modality']),
                        'status' => Lesson::STATUS_COMPLETED,
                    ]);
                }

                if (! StaffAssignment::query()->where('lesson_id', $lesson->id)->where('role', StaffAssignment::ROLE_MONITOR)->exists()) {
                    StaffAssignment::query()->create([
                        'lesson_id' => $lesson->id,
                        'user_id' => $monitor->id,
                        'role' => StaffAssignment::ROLE_MONITOR,
                    ]);
                }

                $enrollment = LessonUser::query()->firstOrCreate(
                    [
                        'lesson_id' => $lesson->id,
                        'user_id' => $user->id,
                    ],
                    [
                        'party_size' => 1,
                        'quantity' => 1,
                        'credits_locked' => 1,
                        'status' => LessonUser::STATUS_ATTENDED,
                        'payment_status' => LessonUser::PAYMENT_CONFIRMED,
                        'confirmed_at' => $start->copy()->subDay(),
                    ]
                );

                $enrollment->update([
                    'status' => LessonUser::STATUS_ATTENDED,
                    'payment_status' => LessonUser::PAYMENT_CONFIRMED,
                    'credits_locked' => 1,
                ]);

                $existingConsumption = BonoConsumption::query()
                    ->where('user_bono_id', $bono->id)
                    ->where('lesson_id', $lesson->id)
                    ->first();

                if (! $existingConsumption) {
                    $usedUc = (int) BonoConsumption::query()
                        ->where('user_bono_id', $bono->id)
                        ->with('lesson:id,modality')
                        ->get()
                        ->sum(fn (BonoConsumption $row) => LessonBonoCreditUnits::unitsFromModality($row->lesson?->modality));
                    $uc = LessonBonoCreditUnits::unitsFromModality($def['modality']);
                    $remainingAfter = max(0, (int) $pack->num_clases - $usedUc - $uc);
                    BonoConsumption::query()->create([
                        'user_bono_id' => $bono->id,
                        'user_id' => $user->id,
                        'lesson_id' => $lesson->id,
                        'remaining_after' => $remainingAfter,
                        'consumed_at' => $start->copy()->addHour(),
                    ]);
                }

                $chargeUc = LessonBonoCreditUnits::unitsFromModality($def['modality']);
                CreditTransaction::query()->firstOrCreate(
                    [
                        'lesson_user_id' => $enrollment->id,
                        'type' => CreditTransaction::TYPE_LESSON_CHARGE,
                        'description' => 'VIP-HIST-SEED-'.$lesson->id,
                    ],
                    [
                        'user_id' => $user->id,
                        'amount' => -$chargeUc,
                        'lesson_id' => $lesson->id,
                    ]
                );
            }

            $usedUc = (int) BonoConsumption::query()
                ->where('user_bono_id', $bono->id)
                ->with('lesson:id,modality')
                ->get()
                ->sum(fn (BonoConsumption $row) => LessonBonoCreditUnits::unitsFromModality($row->lesson?->modality));
            $bono->update([
                'clases_restantes' => max(0, (int) $pack->num_clases - $usedUc),
            ]);
        });
    }
}
