<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\PlanTaquilla;
use App\Models\PagoCuota;
use App\Support\MoneyCents;
use Illuminate\Support\Carbon;
use Faker\Factory as Faker;

class TaquillaSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $faker = Faker::create();
        $fechaHoy = Carbon::today();

        // ===========================================
        // 1. Crear varios planes automáticamente
        // ===========================================
        $planes = [];
        $tiposPlanes = [
            ['nombre' => 'Plan Mensual', 'duracion_dias' => 30, 'precio_total' => 50],
            ['nombre' => 'Plan Trimestral', 'duracion_dias' => 90, 'precio_total' => 140],
            ['nombre' => 'Plan Semestral', 'duracion_dias' => 180, 'precio_total' => 270],
            ['nombre' => 'Plan Anual', 'duracion_dias' => 365, 'precio_total' => 450],
        ];

        foreach ($tiposPlanes as $tipo) {
            $planes[] = PlanTaquilla::create([
                'nombre' => $tipo['nombre'] . " (" . $tipo['duracion_dias'] . " días)",
                'duracion_dias' => $tipo['duracion_dias'],
                'precio_total_cents' => MoneyCents::eurosToCents($tipo['precio_total']),
                'activo' => true,
            ]);
        }

        // ===========================================
        // 2. Crear usuarios con Faker si no hay suficientes
        // ===========================================
        $users = User::all();
        if ($users->count() < 5) {
            $users = User::factory(5)->create();
        }

        // ===========================================
        // 3. Crear pagos aleatorios y asignar planes
        // ===========================================
        foreach ($users as $index => $user) {
            // Elegir un plan al azar
            $plan = $planes[array_rand($planes)];

            // Generar fechas aleatorias coherentes
            $inicio = $faker->dateTimeBetween('-1 year', 'now');
            $fin = (clone $inicio)->modify("+{$plan->duracion_dias} days");

            // 50% de probabilidad de que el plan esté vencido
            if ($faker->boolean(50)) {
                $fin = (clone $inicio)->modify("-{$plan->duracion_dias} days");
            }

            // Crear el pago
            PagoCuota::create([
                'user_id' => $user->id,
                'id_plan_pagado' => $plan->id,
                'monto_pagado_cents' => (int) $plan->precio_total_cents,
                'referencia_pago_externa' => strtoupper($faker->bothify('??#####')),
                'periodo_inicio' => $inicio,
                'periodo_fin' => $fin,
            ]);

            // Actualizar usuario con el plan vigente solo si no está vencido
            if ($fin >= $fechaHoy) {
                $user->update([
                    'fecha_vencimiento_cuota' => $fin,
                    'id_plan_vigente' => $plan->id,
                ]);
            }
        }
    }
}
