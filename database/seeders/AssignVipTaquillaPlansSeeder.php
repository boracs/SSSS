<?php

namespace Database\Seeders;

use App\Models\PagoCuota;
use App\Models\PlanTaquilla;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

/**
 * Asigna pagos confirmados con planes VIP de taquilla a socios marcados como VIP (rol user).
 * Idempotente: usa referencia_pago_externa única por fila.
 */
class AssignVipTaquillaPlansSeeder extends Seeder
{
    public function run(): void
    {
        $vipPlans = PlanTaquilla::query()
            ->where('nombre', 'like', 'Plan VIP%')
            ->where('activo', true)
            ->orderBy('duracion_dias')
            ->get();

        if ($vipPlans->isEmpty()) {
            $this->command?->warn('No hay planes con nombre "Plan VIP%". Ejecuta antes la inserción de planes VIP.');

            return;
        }

        $vipUsers = User::query()
            ->where('is_vip', true)
            ->where('role', 'user')
            ->orderBy('id')
            ->get();

        $lockerBase = 500;

        foreach ($vipUsers as $i => $user) {
            $plansForUser = $vipPlans->values();
            $p0 = $plansForUser[$i % $plansForUser->count()];
            $p1 = $plansForUser[($i + 1) % $plansForUser->count()];

            $this->ensurePago(
                $user,
                $p0,
                Carbon::now()->subMonths(4)->startOfDay(),
                'ASSIGN-VIP-'.$user->id.'-P0'
            );
            $this->ensurePago(
                $user,
                $p1,
                Carbon::now()->subDays(5)->startOfDay(),
                'ASSIGN-VIP-'.$user->id.'-P1'
            );

            $latest = $user->pagosCuotas()
                ->where('status', PagoCuota::STATUS_CONFIRMED)
                ->orderByDesc('periodo_fin')
                ->first();

            if ($latest) {
                $user->update([
                    'id_plan_vigente' => $latest->id_plan_pagado,
                    'fecha_vencimiento_cuota' => $latest->periodo_fin,
                    'numeroTaquilla' => $user->numeroTaquilla ?? ($lockerBase + $i),
                ]);
            }
        }
    }

    private function ensurePago(User $user, PlanTaquilla $plan, Carbon $periodoInicio, string $ref): void
    {
        if (PagoCuota::query()->where('referencia_pago_externa', $ref)->exists()) {
            return;
        }

        $inicio = $periodoInicio->copy()->startOfDay();
        $fin = $inicio->copy()->addDays(max(1, (int) $plan->duracion_dias))->subDay();

        PagoCuota::query()->create([
            'user_id' => $user->id,
            'id_plan_pagado' => $plan->id,
            'monto_pagado_cents' => (int) $plan->precio_total_cents,
            'referencia_pago_externa' => $ref,
            'status' => PagoCuota::STATUS_CONFIRMED,
            'is_checked' => true,
            'payment_method' => 'transferencia',
            'payment_proof_path' => null,
            'proof_uploaded_at' => null,
            'reviewed_at' => Carbon::now(),
            'periodo_inicio' => $inicio,
            'periodo_fin' => $fin,
            'fecha_pago' => $inicio->copy(),
        ]);
    }
}
