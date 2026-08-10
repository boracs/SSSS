<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\PagoCuota;
use App\Models\PaymentReceipt;
use App\Models\PlanTaquilla;
use App\Models\User;
use App\Support\MoneyCents;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Demo coherente de taquillas: planes (mensual/trimestral/semestral/anual),
 * ~50 socios con taquilla y pagos encadenados sin solapes raros.
 *
 * Idempotente por email `demo.taquilla{N}@s4.test`.
 */
class TaquillaDemoCoherentSeeder extends Seeder
{
    private const DEMO_EMAIL_PREFIX = 'demo.taquilla';

    private const DEMO_EMAIL_DOMAIN = 's4.test';

    private const TARGET_LOCKER_USERS = 50;

    /** @var list<string> */
    private const FIRST_NAMES = [
        'Aitor', 'Amaia', 'Ane', 'Asier', 'Beatriz', 'Carmen', 'Diego', 'Elena', 'Endika', 'Garazi',
        'Haizea', 'Iker', 'Ion', 'Irene', 'Itsaso', 'Jon', 'Josu', 'June', 'Leire', 'Lucia',
        'Maider', 'Mikel', 'Nahia', 'Nerea', 'Oier', 'Oskar', 'Paula', 'Roberto', 'Sara', 'Unai',
        'Xabier', 'Yolanda', 'Zuriñe', 'Ander', 'Begoña', 'Carlos', 'Daniel', 'Esther', 'Fermin', 'Gorka',
        'Hodei', 'Inés', 'Javier', 'Kepa', 'Laura', 'Markel', 'Nora', 'Pablo', 'Raquel', 'Sergio',
        'Teresa', 'Uxue', 'Victor', 'Wendy', 'Yaiza',
    ];

    /** @var list<string> */
    private const LAST_NAMES = [
        'Aguirre', 'Arrieta', 'Bengoetxea', 'Etxebarria', 'Garcia', 'Gomez', 'Iriarte', 'Lopez',
        'Martinez', 'Mujika', 'Olaizola', 'Perez', 'Ruiz', 'Sánchez', 'Urrutia', 'Zabala',
        'Alonso', 'Castro', 'Dominguez', 'Fernandez', 'Hernandez', 'Iglesias', 'Jimenez', 'Navarro',
    ];

    public function run(): void
    {
        $today = Carbon::today()->startOfDay();
        $plans = $this->ensurePlans();

        $this->command?->info('Planes listos: '.$plans->pluck('nombre')->implode(', '));

        DB::transaction(function () use ($today, $plans): void {
            $occupied = User::query()
                ->whereNotNull('numeroTaquilla')
                ->pluck('numeroTaquilla')
                ->map(fn ($n) => (int) $n)
                ->filter(fn (int $n) => $n > 0)
                ->unique()
                ->all();

            $freeLockers = [];
            for ($n = 1; $n <= 80; $n++) {
                if (! in_array($n, $occupied, true)) {
                    $freeLockers[] = $n;
                }
            }

            $existingWithLocker = (int) User::query()
                ->whereNotNull('numeroTaquilla')
                ->where('numeroTaquilla', '>', 0)
                ->count();

            $need = max(0, self::TARGET_LOCKER_USERS - $existingWithLocker);

            if ($need === 0) {
                $this->command?->warn('Ya hay ≥'.self::TARGET_LOCKER_USERS.' socios con taquilla; re-sincronizando demos…');
                $this->resyncAllDemoUsers();

                return;
            }

            $created = 0;
            $index = 1;

            while ($created < $need && $index <= 120 && count($freeLockers) > 0) {
                $email = self::DEMO_EMAIL_PREFIX.$index.'@'.self::DEMO_EMAIL_DOMAIN;
                if (User::query()->where('email', $email)->exists()) {
                    $index++;
                    continue;
                }

                $locker = array_shift($freeLockers);
                if ($locker === null) {
                    break;
                }

                $user = $this->createDemoUser($index, $locker);
                $this->seedPaymentsForUser($user, $plans, $today, $created);

                $created++;
                $index++;
            }

            $this->command?->info("Creados {$created} socios demo con taquilla y pagos coherentes.");
        });

        $this->command?->info(
            'Totales → usuarios c/taquilla: '.User::query()->whereNotNull('numeroTaquilla')->where('numeroTaquilla', '>', 0)->count()
            .' | pagos: '.PagoCuota::query()->count()
            .' | planes: '.PlanTaquilla::query()->count()
        );
    }

    /**
     * @return \Illuminate\Support\Collection<int, PlanTaquilla>
     */
    private function ensurePlans()
    {
        $defs = [
            ['match' => 'mensual', 'nombre' => 'Taquilla Mensual', 'dias' => 30, 'euros' => 60.0],
            ['match' => 'trimestral', 'nombre' => 'Taquilla Trimestral', 'dias' => 90, 'euros' => 165.0],
            ['match' => 'semestral', 'nombre' => 'Taquilla Semestral', 'dias' => 180, 'euros' => 300.0],
            ['match' => 'anual', 'nombre' => 'Taquilla Anual', 'dias' => 365, 'euros' => 480.0],
        ];

        $out = collect();

        foreach ($defs as $def) {
            $plan = PlanTaquilla::query()
                ->whereRaw('LOWER(nombre) LIKE ?', ['%'.$def['match'].'%'])
                ->orderBy('id')
                ->first();

            if ($plan === null) {
                $plan = PlanTaquilla::query()->create([
                    'nombre' => $def['nombre'],
                    'duracion_dias' => $def['dias'],
                    'precio_total_cents' => MoneyCents::eurosToCents($def['euros']),
                    'activo' => true,
                ]);
            } else {
                $plan->update([
                    'nombre' => $def['nombre'],
                    'duracion_dias' => $def['dias'],
                    'precio_total_cents' => MoneyCents::eurosToCents($def['euros']),
                    'activo' => true,
                ]);
            }

            $out->put($def['match'], $plan->fresh());
        }

        return $out;
    }

    private function createDemoUser(int $index, int $locker): User
    {
        $nombre = self::FIRST_NAMES[($index - 1) % count(self::FIRST_NAMES)];
        $apellido = self::LAST_NAMES[($index - 1) % count(self::LAST_NAMES)];
        $phoneSuffix = str_pad((string) (600000000 + $index), 9, '0', STR_PAD_LEFT);

        return User::query()->create([
            'role' => 'user',
            'is_vip' => false,
            'nombre' => $nombre,
            'apellido' => $apellido,
            'email' => self::DEMO_EMAIL_PREFIX.$index.'@'.self::DEMO_EMAIL_DOMAIN,
            'telefono' => '+34'.$phoneSuffix,
            'numeroTaquilla' => $locker,
            'password' => Hash::make('password'),
            'email_verified_at' => now(),
            'remember_token' => Str::random(10),
        ]);
    }

    /**
     * @param  \Illuminate\Support\Collection<string, PlanTaquilla>  $plans
     */
    private function seedPaymentsForUser(User $user, $plans, Carbon $today, int $slot): void
    {
        // Distribución visual: activos, pronto a vencer (≤7), vencidos, y algún pending Stripe.
        $bucket = $slot % 10;
        $scenario = match (true) {
            $bucket <= 4 => 'active_ok',      // 50%
            $bucket <= 6 => 'active_soon',    // 20% ≤7 días
            $bucket <= 8 => 'overdue',        // 20%
            default => 'pending_checkout',    // 10%
        };

        $planKeys = ['mensual', 'trimestral', 'semestral', 'anual'];
        $primaryKey = $planKeys[$slot % count($planKeys)];
        $primary = $plans->get($primaryKey);
        if ($primary === null) {
            $primary = $plans->first();
        }

        $confirmedChain = [];

        if ($scenario === 'pending_checkout') {
            // Historial confirmado corto + pendiente Stripe sin confirmar.
            $confirmedChain[] = $this->buildPeriod($primary, $today->copy()->subDays((int) $primary->duracion_dias + 40));
            $this->insertConfirmed($user, $primary, $confirmedChain[0], 'card', $today->copy()->subDays(50));

            $pendingStart = $today->copy()->addDay();
            $pendingEnd = $pendingStart->copy()->addDays((int) $primary->duracion_dias)->subDay();
            PagoCuota::query()->create([
                'user_id' => $user->id,
                'id_plan_pagado' => $primary->id,
                'monto_pagado_cents' => (int) $primary->precio_total_cents,
                'status' => PagoCuota::STATUS_PENDING,
                'payment_method' => 'card',
                'referencia_pago_externa' => "{$user->nombre} {$user->apellido} — {$primary->nombre} · T#{$user->numeroTaquilla}",
                'periodo_inicio' => $pendingStart,
                'periodo_fin' => $pendingEnd,
                'fecha_pago' => now()->subHours(($slot % 12) + 1),
                'reviewed_at' => null,
            ]);
        } elseif ($scenario === 'overdue') {
            $daysOverdue = 5 + ($slot % 25);
            $end = $today->copy()->subDays($daysOverdue)->endOfDay();
            $start = $end->copy()->subDays((int) $primary->duracion_dias - 1)->startOfDay();
            $confirmedChain[] = ['inicio' => $start, 'fin' => $end];
            $this->insertConfirmed($user, $primary, $confirmedChain[0], 'card', $start->copy()->addDay());
        } elseif ($scenario === 'active_soon') {
            $daysLeft = 1 + ($slot % 7); // 1..7
            $end = $today->copy()->addDays($daysLeft)->endOfDay();
            $start = $end->copy()->subDays((int) $primary->duracion_dias - 1)->startOfDay();
            $confirmedChain[] = ['inicio' => $start, 'fin' => $end];
            $this->insertConfirmed($user, $primary, $confirmedChain[0], 'card', $start->copy()->addHours(3));
        } else {
            // Activo con margen; algunos con prepago (siguiente periodo ya pagado).
            $daysLeft = 15 + ($slot % 80);
            $end = $today->copy()->addDays($daysLeft)->endOfDay();
            $start = $end->copy()->subDays((int) $primary->duracion_dias - 1)->startOfDay();
            $confirmedChain[] = ['inicio' => $start, 'fin' => $end];
            $this->insertConfirmed($user, $primary, $confirmedChain[0], 'card', $start->copy()->addHours(2));

            if ($slot % 4 === 0) {
                $nextPlan = $plans->get($planKeys[($slot + 1) % count($planKeys)]) ?? $primary;
                $nextStart = $end->copy()->addDay()->startOfDay();
                $nextEnd = $nextStart->copy()->addDays((int) $nextPlan->duracion_dias)->subDay()->endOfDay();
                $this->insertConfirmed(
                    $user,
                    $nextPlan,
                    ['inicio' => $nextStart, 'fin' => $nextEnd],
                    'card',
                    $today->copy()->subDays($slot % 20),
                );
            }
        }

        // Algunos tienen un pago histórico anterior encadenado.
        if ($scenario !== 'pending_checkout' && $slot % 3 === 0 && isset($confirmedChain[0])) {
            $histPlan = $plans->get('mensual') ?? $primary;
            $histEnd = Carbon::parse($confirmedChain[0]['inicio'])->subDay()->endOfDay();
            $histStart = $histEnd->copy()->subDays((int) $histPlan->duracion_dias - 1)->startOfDay();
            $this->insertConfirmed(
                $user,
                $histPlan,
                ['inicio' => $histStart, 'fin' => $histEnd],
                ($slot % 5 === 0) ? 'datafono' : 'card',
                $histStart->copy()->addDay(),
            );
        }

        $this->syncUserCache($user);
    }

    /**
     * @return array{inicio: Carbon, fin: Carbon}
     */
    private function buildPeriod(PlanTaquilla $plan, Carbon $startHint): array
    {
        $inicio = $startHint->copy()->startOfDay();
        $fin = $inicio->copy()->addDays((int) $plan->duracion_dias)->subDay()->endOfDay();

        return ['inicio' => $inicio, 'fin' => $fin];
    }

    /**
     * @param  array{inicio: Carbon, fin: Carbon}  $period
     */
    private function insertConfirmed(
        User $user,
        PlanTaquilla $plan,
        array $period,
        string $method,
        Carbon $paidAt,
    ): void {
        $pago = PagoCuota::query()->create([
            'user_id' => $user->id,
            'id_plan_pagado' => $plan->id,
            'monto_pagado_cents' => (int) $plan->precio_total_cents,
            'status' => PagoCuota::STATUS_CONFIRMED,
            'payment_method' => $method,
            'referencia_pago_externa' => trim("{$user->nombre} {$user->apellido} — {$plan->nombre} · T#{$user->numeroTaquilla}"),
            'periodo_inicio' => $period['inicio'],
            'periodo_fin' => $period['fin'],
            'fecha_pago' => $paidAt,
            'reviewed_at' => $paidAt,
            'is_checked' => true,
        ]);

        $this->attachDemoProof($pago, $method, $paidAt);
    }

    /**
     * Simula el comprobante que este pago tendría en producción: recibo Stripe para
     * "card". Sin esto, la columna "Recibo" del admin sale siempre "—" en el dataset
     * demo aunque el pago figure como "Pagado". Un cobro en mostrador (datáfono) no
     * genera recibo en la app: el justificante es el ticket del TPV.
     */
    private function attachDemoProof(PagoCuota $pago, string $method, Carbon $paidAt): void
    {
        if ($method !== 'card') {
            return;
        }

        PaymentReceipt::query()->updateOrCreate(
            ['stripe_checkout_session_id' => 'cs_test_demo_taquilla_'.$pago->id],
            [
                'payable_type' => PagoCuota::class,
                'payable_id' => $pago->id,
                'stripe_payment_intent_id' => 'pi_demo_taquilla_'.$pago->id,
                'receipt_url' => url('/demo/recibo-stripe-sandbox.html'),
                'captured_at' => $paidAt->copy()->addMinutes(5),
            ]
        );
    }

    private function syncUserCache(User $user): void
    {
        $now = now();
        $active = PagoCuota::query()
            ->where('user_id', $user->id)
            ->where('status', PagoCuota::STATUS_CONFIRMED)
            ->where('periodo_inicio', '<=', $now)
            ->where('periodo_fin', '>=', $now)
            ->orderByDesc('periodo_fin')
            ->first();

        $last = PagoCuota::query()
            ->where('user_id', $user->id)
            ->where('status', PagoCuota::STATUS_CONFIRMED)
            ->orderByDesc('periodo_fin')
            ->first();

        $user->update([
            'fecha_vencimiento_cuota' => $active?->periodo_fin ?? $last?->periodo_fin,
            'id_plan_vigente' => $active?->id_plan_pagado ?? $last?->id_plan_pagado,
        ]);
    }

    private function resyncAllDemoUsers(): void
    {
        User::query()
            ->where('email', 'like', self::DEMO_EMAIL_PREFIX.'%@'.self::DEMO_EMAIL_DOMAIN)
            ->each(fn (User $u) => $this->syncUserCache($u));
    }
}
