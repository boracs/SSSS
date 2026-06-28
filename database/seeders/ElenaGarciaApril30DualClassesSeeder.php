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
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ElenaGarciaApril30DualClassesSeeder extends Seeder
{
    public function run(): void
    {
        $elena = User::query()
            ->whereRaw("LOWER(nombre) like ?", ['%elena%'])
            ->whereRaw("LOWER(apellido) like ?", ['%garcia%'])
            ->first()
            ?? User::query()->where('email', 'like', '%elena%garcia%')->first();

        if (! $elena) {
            $this->command?->warn('No se encontro Elena Garcia; se omite.');

            return;
        }

        $monitor = User::query()
            ->where('email', 'like', '%staff.superseed%@masquesurf.local')
            ->orderBy('id')
            ->first()
            ?? User::query()->where('role', 'admin')->orderBy('id')->first();

        if (! $monitor) {
            $this->command?->warn('No hay monitor/admin disponible; se omite.');

            return;
        }

        DB::transaction(function () use ($elena, $monitor) {
            $pack = PackBono::query()->firstOrCreate(
                ['nombre' => 'Bono VIP Elena Seed'],
                ['num_clases' => 20, 'precio' => 320, 'activo' => false]
            );

            $bono = UserBono::query()->firstOrCreate(
                ['user_id' => $elena->id, 'admin_notes' => 'Bono seed VIP para Elena Garcia'],
                [
                    'pack_id' => $pack->id,
                    'clases_restantes' => (int) $pack->num_clases,
                    'status' => UserBono::STATUS_CONFIRMED,
                ]
            );

            $baseDate = Carbon::create(2026, 4, 30, 0, 0, 0);
            $morningStart = $baseDate->copy()->setTime(10, 0);
            $afternoonStart = $baseDate->copy()->setTime(17, 0);

            $morningLesson = Lesson::query()->firstOrCreate(
                ['title' => 'VIP-HIST Elena Garcia · 30 Abril Mañana Grupal'],
                [
                    'description' => 'Clase grupal historica para visualizacion de grupo con Elena.',
                    'starts_at' => $morningStart,
                    'ends_at' => $morningStart->copy()->addMinutes(90),
                    'type' => Lesson::TYPE_SURF,
                    'modality' => Lesson::MODALITY_GRUPAL,
                    'level' => Lesson::LEVEL_INICIACION,
                    'max_slots' => 8,
                    'max_capacity' => 8,
                    'price' => 35,
                    'currency' => 'EUR',
                    'location' => 'Playa Zurriola',
                    'is_private' => false,
                    'is_surf_trip' => false,
                    'is_optimal_waves' => false,
                    'status' => Lesson::STATUS_COMPLETED,
                ]
            );

            $afternoonLesson = Lesson::query()->firstOrCreate(
                ['title' => 'VIP-HIST Elena Garcia · 30 Abril Tarde Grupal'],
                [
                    'description' => 'Clase grupal historica para Elena Garcia.',
                    'starts_at' => $afternoonStart,
                    'ends_at' => $afternoonStart->copy()->addMinutes(90),
                    'type' => Lesson::TYPE_SURF,
                    'modality' => Lesson::MODALITY_GRUPAL,
                    'level' => Lesson::LEVEL_INICIACION,
                    'max_slots' => 8,
                    'max_capacity' => 8,
                    'price' => 35,
                    'currency' => 'EUR',
                    'location' => 'Playa Zurriola',
                    'is_private' => false,
                    'is_surf_trip' => false,
                    'is_optimal_waves' => false,
                    'status' => Lesson::STATUS_COMPLETED,
                ]
            );

            foreach ([$morningLesson, $afternoonLesson] as $lesson) {
                $lesson->update([
                    'status' => Lesson::STATUS_COMPLETED,
                    'starts_at' => $lesson->starts_at,
                    'ends_at' => $lesson->ends_at,
                    'modality' => str_contains((string) $lesson->title, 'Tarde Grupal') ? Lesson::MODALITY_GRUPAL : $lesson->modality,
                    'is_private' => str_contains((string) $lesson->title, 'Tarde Grupal') ? false : $lesson->is_private,
                    'max_slots' => str_contains((string) $lesson->title, 'Tarde Grupal') ? 8 : $lesson->max_slots,
                    'max_capacity' => str_contains((string) $lesson->title, 'Tarde Grupal') ? 8 : $lesson->max_capacity,
                ]);

                StaffAssignment::query()->firstOrCreate([
                    'lesson_id' => $lesson->id,
                    'user_id' => $monitor->id,
                    'role' => StaffAssignment::ROLE_MONITOR,
                ]);
            }

            $this->seedElenaEnrollment($elena, $bono, $pack, $morningLesson, 'Comentario monitor: muy buena adaptacion en grupo y lectura de prioridad en el pico.');
            $this->seedElenaEnrollment($elena, $bono, $pack, $afternoonLesson, 'Comentario monitor: progreso tecnico en maniobra de giro y postura de salida.');

            // Para que la clase grupal de la mañana salga "con mas gente".
            $extraUsers = User::query()
                ->where('id', '!=', $elena->id)
                ->where('role', 'user')
                ->orderBy('id')
                ->limit(3)
                ->get();

            foreach ($extraUsers as $extra) {
                LessonUser::query()->firstOrCreate(
                    ['lesson_id' => $morningLesson->id, 'user_id' => $extra->id],
                    [
                        'party_size' => 1,
                        'quantity' => 1,
                        'credits_locked' => 0,
                        'status' => LessonUser::STATUS_ATTENDED,
                        'payment_status' => LessonUser::PAYMENT_CONFIRMED,
                        'confirmed_at' => $morningStart->copy()->subDay(),
                    ]
                );
            }

            // Añadimos al menos 1 alumno extra por la tarde para que esa sesión compute como 1 crédito.
            $afternoonExtraUser = User::query()
                ->where('id', '!=', $elena->id)
                ->where('role', 'user')
                ->orderBy('id')
                ->first();

            if ($afternoonExtraUser) {
                LessonUser::query()->firstOrCreate(
                    ['lesson_id' => $afternoonLesson->id, 'user_id' => $afternoonExtraUser->id],
                    [
                        'party_size' => 1,
                        'quantity' => 1,
                        'credits_locked' => 0,
                        'status' => LessonUser::STATUS_ATTENDED,
                        'payment_status' => LessonUser::PAYMENT_CONFIRMED,
                        'confirmed_at' => $afternoonStart->copy()->subDay(),
                    ]
                );
            }

            // Limpieza del seed anterior por si existia la variante "Tarde Particular".
            $legacyAfternoonParticular = Lesson::query()
                ->where('title', 'VIP-HIST Elena Garcia · 30 Abril Tarde Particular')
                ->first();
            if ($legacyAfternoonParticular) {
                LessonUser::query()->where('lesson_id', $legacyAfternoonParticular->id)->delete();
                BonoConsumption::query()->where('lesson_id', $legacyAfternoonParticular->id)->where('user_id', $elena->id)->delete();
                CreditTransaction::query()->where('lesson_id', $legacyAfternoonParticular->id)->where('user_id', $elena->id)->delete();
                StaffAssignment::query()->where('lesson_id', $legacyAfternoonParticular->id)->delete();
                $legacyAfternoonParticular->delete();
            }

            $usedTotal = BonoConsumption::query()->where('user_bono_id', $bono->id)->count();
            $bono->update([
                'clases_restantes' => max(0, (int) $pack->num_clases - $usedTotal),
            ]);
        });

        $this->command?->info('Seeder ElenaGarciaApril30DualClassesSeeder ejecutado correctamente.');
    }

    private function seedElenaEnrollment(User $elena, UserBono $bono, PackBono $pack, Lesson $lesson, string $comment): void
    {
        $enrollment = LessonUser::query()->firstOrCreate(
            ['lesson_id' => $lesson->id, 'user_id' => $elena->id],
            [
                'party_size' => 1,
                'quantity' => 1,
                'credits_locked' => 1,
                'status' => LessonUser::STATUS_ATTENDED,
                'payment_status' => LessonUser::PAYMENT_CONFIRMED,
                'confirmed_at' => optional($lesson->starts_at)?->copy()?->subDay(),
                'admin_notes' => $comment,
            ]
        );

        $enrollment->update([
            'status' => LessonUser::STATUS_ATTENDED,
            'payment_status' => LessonUser::PAYMENT_CONFIRMED,
            'credits_locked' => 1,
            'admin_notes' => $comment,
        ]);

        if (! BonoConsumption::query()->where('user_bono_id', $bono->id)->where('lesson_id', $lesson->id)->exists()) {
            $used = BonoConsumption::query()->where('user_bono_id', $bono->id)->count();
            BonoConsumption::query()->create([
                'user_bono_id' => $bono->id,
                'user_id' => $elena->id,
                'lesson_id' => $lesson->id,
                'remaining_after' => max(0, (int) $pack->num_clases - $used - 1),
                'consumed_at' => optional($lesson->starts_at)?->copy()?->addHour() ?? now(),
            ]);
        }

        CreditTransaction::query()->firstOrCreate(
            [
                'lesson_user_id' => $enrollment->id,
                'type' => CreditTransaction::TYPE_LESSON_CHARGE,
                'description' => 'VIP-APR30-ELENA-'.$lesson->id,
            ],
            [
                'user_id' => $elena->id,
                'amount' => -1,
                'lesson_id' => $lesson->id,
            ]
        );
    }
}
