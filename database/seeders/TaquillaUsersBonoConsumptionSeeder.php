<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\PackBono;
use App\Models\User;
use App\Models\UserBono;
use Database\Seeders\Concerns\SeedsBonoConsumptions;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Asigna a TODOS los socios con taquilla un bono confirmado con algun consumo
 * (clases VIP asistidas). Idempotente: omite usuarios que ya tienen bonos.
 */
class TaquillaUsersBonoConsumptionSeeder extends Seeder
{
    use SeedsBonoConsumptions;

    public function run(): void
    {
        $monitor = $this->resolveMonitor();
        if (! $monitor) {
            $this->command?->warn('No hay monitor/admin; se omite TaquillaUsersBonoConsumptionSeeder.');

            return;
        }

        $packs = PackBono::query()->where('activo', true)->get();
        if ($packs->isEmpty()) {
            $this->command?->warn('No hay packs de bono activos; se omite.');

            return;
        }

        $faker = \Faker\Factory::create('es_ES');
        $seeded = 0;

        User::query()
            ->whereNotNull('numeroTaquilla')
            ->where(fn ($q) => $q->where('role', '!=', 'admin')->orWhereNull('role'))
            ->chunkById(50, function (Collection $users) use ($monitor, $packs, $faker, &$seeded): void {
                foreach ($users as $user) {
                    // Idempotencia: no tocar usuarios que ya tienen bonos (incl. Borja).
                    if (UserBono::query()->where('user_id', $user->id)->exists()) {
                        continue;
                    }

                    DB::transaction(function () use ($user, $monitor, $packs, $faker, &$seeded): void {
                        if (! $user->is_vip) {
                            $user->forceFill(['is_vip' => true])->save();
                        }

                        /** @var PackBono $pack */
                        $pack = $packs->random();
                        $maxConsumo = max(1, min(5, (int) $pack->num_clases - 1));
                        $consumo = $faker->numberBetween(2, $maxConsumo);
                        $purchasedAt = Carbon::now()->subDays($faker->numberBetween(40, 160));

                        $this->seedConfirmedBono(
                            user: $user,
                            monitor: $monitor,
                            pack: $pack,
                            consumeCredits: $consumo,
                            marker: 'SEED bono taquilla u'.$user->id,
                            purchasedAt: $purchasedAt,
                        );

                        $seeded++;
                    });
                }
            });

        $this->command?->info("TaquillaUsersBonoConsumptionSeeder: {$seeded} socios con consumo de bonos.");
    }
}
