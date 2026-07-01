<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Lesson;
use App\Models\LessonUser;
use App\Models\PackBono;
use App\Models\PlanTaquilla;
use App\Models\StaffAssignment;
use App\Models\User;
use App\Support\LessonBonoCreditUnits;
use Database\Seeders\Concerns\SeedsBonoConsumptions;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Datos VIP para Borja (borjauser@gmail.com):
 *  - 4 bonos completamente consumidos (clases_restantes = 0)
 *  - 1 bono vigente (con clases restantes)
 *  - Clases VIP pasadas (las del consumo) + 2 clases VIP programadas.
 */
class BorjaVipConsumptionSeeder extends Seeder
{
    use SeedsBonoConsumptions;

    public function run(): void
    {
        $monitor = $this->resolveMonitor();
        if (! $monitor) {
            $this->command?->warn('No hay monitor/admin; se omite BorjaVipConsumptionSeeder.');

            return;
        }

        $borja = User::query()->firstOrCreate(
            ['email' => 'borjauser@gmail.com'],
            [
                'nombre' => 'Borja',
                'apellido' => 'User',
                'telefono' => '600123123',
                'password' => Hash::make('password'),
                'role' => 'user',
            ]
        );

        $plan = PlanTaquilla::query()->where('activo', true)->orderBy('precio_total_cents')->first();

        $borja->forceFill([
            'is_vip' => true,
            'numeroTaquilla' => $borja->numeroTaquilla ?? ((int) User::query()->max('numeroTaquilla') + 1),
            'id_plan_vigente' => $plan?->id,
            'fecha_vencimiento_cuota' => Carbon::now()->addMonths(2),
        ])->save();

        $packConsumido = $this->pickActivePack(8) ?? PackBono::query()->where('activo', true)->first();
        $packVigente = $this->pickActivePack(12) ?? $packConsumido;

        if (! $packConsumido) {
            $this->command?->warn('No hay packs activos; se omite Borja.');

            return;
        }

        DB::transaction(function () use ($borja, $monitor, $packConsumido, $packVigente): void {
            // 4 bonos consumidos por completo.
            for ($n = 1; $n <= 4; $n++) {
                $this->seedConfirmedBono(
                    user: $borja,
                    monitor: $monitor,
                    pack: $packConsumido,
                    consumeCredits: (int) $packConsumido->num_clases,
                    marker: "BORJA bono consumido #{$n}",
                    purchasedAt: Carbon::now()->subMonths(7 - $n),
                );
            }

            // 1 bono vigente con consumo parcial (4 clases consumidas).
            $this->seedConfirmedBono(
                user: $borja,
                monitor: $monitor,
                pack: $packVigente,
                consumeCredits: 4,
                marker: 'BORJA bono vigente',
                purchasedAt: Carbon::now()->subDays(20),
            );

            $this->seedUpcomingVipLessons($borja, $monitor);
        });

        $this->command?->info('BorjaVipConsumptionSeeder: Borja con 4 bonos consumidos + 1 vigente y clases VIP.');
    }

    private function seedUpcomingVipLessons(User $user, User $monitor): void
    {
        $defs = [
            ['mod' => Lesson::MODALITY_GRUPAL, 'days' => 4, 'hour' => 10],
            ['mod' => Lesson::MODALITY_PARTICULAR, 'days' => 9, 'hour' => 17],
        ];

        foreach ($defs as $idx => $def) {
            $isPrivate = $def['mod'] === Lesson::MODALITY_PARTICULAR;
            $start = Carbon::now()->addDays((int) $def['days'])->setTime((int) $def['hour'], 0);
            $title = sprintf('VIP-PROX Borja #%d', $idx + 1);

            $lesson = Lesson::query()->firstOrCreate(
                ['title' => $title],
                [
                    'description' => 'Clase VIP programada (seed).',
                    'starts_at' => $start,
                    'ends_at' => (clone $start)->addMinutes(90),
                    'type' => Lesson::TYPE_SURF,
                    'modality' => $def['mod'],
                    'level' => Lesson::LEVEL_INICIACION,
                    'max_slots' => $isPrivate ? 1 : 8,
                    'max_capacity' => $isPrivate ? 1 : 8,
                    'price' => $isPrivate ? 85 : 35,
                    'currency' => 'EUR',
                    'location' => 'Playa Zurriola',
                    'is_private' => $isPrivate,
                    'is_surf_trip' => false,
                    'is_optimal_waves' => false,
                    'status' => Lesson::STATUS_SCHEDULED,
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
                    'credits_locked' => LessonBonoCreditUnits::unitsFromModality($def['mod']),
                    'status' => LessonUser::STATUS_CONFIRMED,
                    'payment_status' => LessonUser::PAYMENT_CONFIRMED,
                    'confirmed_at' => Carbon::now(),
                ]
            );
        }
    }
}
