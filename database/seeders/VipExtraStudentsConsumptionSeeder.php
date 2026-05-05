<?php

namespace Database\Seeders;

use App\Models\BonoConsumption;
use App\Models\CreditTransaction;
use App\Models\Lesson;
use App\Models\LessonUser;
use App\Models\PackBono;
use App\Models\StaffAssignment;
use App\Models\User;
use App\Models\UserBono;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class VipExtraStudentsConsumptionSeeder extends Seeder
{
    public function run(): void
    {
        $monitor = User::query()
            ->where('email', 'like', '%staff.superseed%@masquesurf.local')
            ->orderBy('id')
            ->first()
            ?? User::query()->where('role', 'admin')->orderBy('id')->first();

        if (! $monitor) {
            $this->command?->warn('No hay monitor/admin disponible; se omite.');

            return;
        }

        $vipUsers = User::query()
            ->where('is_vip', true)
            ->where('role', 'user')
            ->whereNotNull('email')
            ->where('email', 'not like', 'alumnovip@gmail.com')
            ->where('email', 'not like', '%elena%')
            ->orderBy('id')
            ->limit(2)
            ->get();

        if ($vipUsers->isEmpty()) {
            $this->command?->warn('No se encontraron alumnos VIP extra para sembrar consumos.');

            return;
        }

        foreach ($vipUsers as $user) {
            DB::transaction(function () use ($user, $monitor) {
                $pack = PackBono::query()->firstOrCreate(
                    ['nombre' => 'Bono VIP Seed Extra'],
                    [
                        'num_clases' => 15,
                        'precio' => 260,
                        'activo' => true,
                    ]
                );

                $bono = UserBono::query()->firstOrCreate(
                    [
                        'user_id' => $user->id,
                        'admin_notes' => 'Bono seed VIP extra para '.$user->email,
                    ],
                    [
                        'pack_id' => $pack->id,
                        'clases_restantes' => (int) $pack->num_clases,
                        'status' => UserBono::STATUS_CONFIRMED,
                    ]
                );

                CreditTransaction::query()->firstOrCreate(
                    [
                        'user_id' => $user->id,
                        'type' => CreditTransaction::TYPE_PURCHASE,
                        'description' => 'Compra bono VIP seed extra '.$user->id,
                    ],
                    [
                        'amount' => (int) $pack->num_clases,
                    ]
                );

                $defs = [
                    ['suffix' => 'Grupal', 'modality' => Lesson::MODALITY_GRUPAL, 'daysAgo' => 18, 'hour' => 10],
                    ['suffix' => 'Particular', 'modality' => Lesson::MODALITY_PARTICULAR, 'daysAgo' => 12, 'hour' => 12],
                    ['suffix' => 'Semanal', 'modality' => Lesson::MODALITY_SEMANAL, 'daysAgo' => 7, 'hour' => 17],
                ];

                foreach ($defs as $index => $def) {
                    $title = 'VIP-HIST Extra '.$user->id.' · '.$def['suffix'];
                    $start = now()->subDays((int) $def['daysAgo'])->setTime((int) $def['hour'], 0);
                    $end = (clone $start)->addMinutes(90);
                    $isPrivate = $def['modality'] === Lesson::MODALITY_PARTICULAR;

                    $lesson = Lesson::query()->firstOrCreate(
                        ['title' => $title],
                        [
                            'description' => 'Clase historica seed VIP extra.',
                            'starts_at' => $start,
                            'ends_at' => $end,
                            'type' => Lesson::TYPE_SURF,
                            'modality' => $def['modality'],
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

                    $lesson->update([
                        'starts_at' => $start,
                        'ends_at' => $end,
                        'status' => Lesson::STATUS_COMPLETED,
                    ]);

                    StaffAssignment::query()->firstOrCreate([
                        'lesson_id' => $lesson->id,
                        'user_id' => $monitor->id,
                        'role' => StaffAssignment::ROLE_MONITOR,
                    ]);

                    $monitorComment = $index === 0
                        ? 'Comentario monitor: avance solido en postura y control de direccion; reforzar timing de despegue.'
                        : null;

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
                            'admin_notes' => $monitorComment,
                        ]
                    );

                    $enrollment->update([
                        'status' => LessonUser::STATUS_ATTENDED,
                        'payment_status' => LessonUser::PAYMENT_CONFIRMED,
                        'credits_locked' => 1,
                        'admin_notes' => $monitorComment ?: $enrollment->admin_notes,
                    ]);

                    if (! BonoConsumption::query()->where('user_bono_id', $bono->id)->where('lesson_id', $lesson->id)->exists()) {
                        $used = BonoConsumption::query()->where('user_bono_id', $bono->id)->count();
                        BonoConsumption::query()->create([
                            'user_bono_id' => $bono->id,
                            'user_id' => $user->id,
                            'lesson_id' => $lesson->id,
                            'remaining_after' => max(0, (int) $pack->num_clases - $used - 1),
                            'consumed_at' => $start->copy()->addHour(),
                        ]);
                    }

                    CreditTransaction::query()->firstOrCreate(
                        [
                            'lesson_user_id' => $enrollment->id,
                            'type' => CreditTransaction::TYPE_LESSON_CHARGE,
                            'description' => 'VIP-HIST-EXTRA-'.$user->id.'-'.$lesson->id,
                        ],
                        [
                            'user_id' => $user->id,
                            'amount' => -1,
                            'lesson_id' => $lesson->id,
                        ]
                    );
                }

                $usedTotal = BonoConsumption::query()->where('user_bono_id', $bono->id)->count();
                $bono->update([
                    'clases_restantes' => max(0, (int) $pack->num_clases - $usedTotal),
                ]);
            });
        }

        $this->command?->info('Seeder VipExtraStudentsConsumptionSeeder ejecutado correctamente.');
    }
}
