<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\PaymentStatus;
use App\Models\AutoCoachReferenceVideo;
use App\Models\Booking;
use App\Models\Carrito;
use App\Models\CreditTransaction;
use App\Models\EmergencyKeyRequest;
use App\Models\Lesson;
use App\Models\LessonUser;
use App\Models\PackBono;
use App\Models\PagoCuota;
use App\Models\PaymentWebhookIdempotency;
use App\Models\Pedido;
use App\Models\PlanTaquilla;
use App\Models\PriceSchema;
use App\Models\Producto;
use App\Models\StaffAssignment;
use App\Models\Surfboard;
use App\Models\User;
use App\Models\UserBono;
use App\Services\BookingService;
use App\Support\MoneyCents;
use Carbon\Carbon;
use Database\Seeders\Concerns\SeedsVipAcademyEnrollments;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Seeder maestro con datos coherentes en todo el ecosistema S4.
 *
 * Orden lógico: catálogos → usuarios → taquillas/bonos → academia → tienda → alquileres → auditoría.
 */
final class CoherentDemoSeeder extends Seeder
{
    use SeedsVipAcademyEnrollments;

    private const DEMO_PASSWORD = '12121212';

    public function run(): void
    {
        DB::transaction(function (): void {
            $this->seedCatalogs();
            $this->call(AutoCoachReferenceVideoSeeder::class);
            $this->call(SecondHandBoardSeeder::class);

            $admin = $this->seedAdmin();
            $demoUser = $this->seedDemoUser();
            $monitors = $this->seedMonitors();
            $extras = $this->seedExtraClients(6);

            $allClients = array_merge([$demoUser], $extras);
            $plans = PlanTaquilla::query()->orderBy('id')->get()->all();
            $packs = PackBono::query()->orderBy('id')->get()->all();
            $products = Producto::query()->where('eliminado', false)->get()->all();
            $boards = Surfboard::query()->where('is_active', true)->get()->all();

            $this->seedDemoUserLocker($demoUser, $plans[0]);
            $this->seedDemoUserBonos($demoUser, $packs, $admin);
            $this->seedStoreForUser($demoUser, $products, paidOrder: true);
            $this->seedCarritoForUser($admin, $products);

            $lessons = $this->seedAcademyLessons($monitors, $admin);
            $this->ensureVipLessonPool(collect($monitors), 14);
            $this->seedBonosForExtras($extras, $packs);
            $this->seedAcademyForExtras($extras, $lessons);
            $this->seedAllVipAcademyEnrollments($admin);
            $this->seedDemoUserPendingLessonRequest($demoUser, $lessons);
            $this->seedLockersForExtras($extras, $plans);
            $this->seedRentals($allClients, $boards);
            $this->seedPaymentWebhooks($demoUser);
            $this->seedEmergencyKeyHistory($demoUser, $admin);
        });

        $this->call(BorjaReservationsSeeder::class);

        $this->command?->info('CoherentDemoSeeder OK — admin@gmail.com / user@gmail.com → contraseña '.self::DEMO_PASSWORD);
    }

    private function seedCatalogs(): void
    {
        $this->seedLockerPlans();
        $this->seedBonoPacks();
        $this->seedRentalCatalog();
        $this->seedProducts();
    }

    private function seedLockerPlans(): void
    {
        $defs = [
            ['nombre' => 'Taquilla Mensual', 'dias' => 30, 'eur' => 60, 'vip' => false, 'desc' => 45],
            ['nombre' => 'Taquilla Trimestral', 'dias' => 90, 'eur' => 165, 'vip' => false, 'desc' => 45],
            ['nombre' => 'Taquilla VIP Anual', 'dias' => 365, 'eur' => 480, 'vip' => true, 'desc' => 50],
        ];

        foreach ($defs as $def) {
            PlanTaquilla::query()->firstOrCreate(
                ['nombre' => $def['nombre']],
                [
                    'duracion_dias' => $def['dias'],
                    'precio_total_cents' => MoneyCents::eurosToCents($def['eur']),
                    'activo' => true,
                    'descripcion' => 'Acceso taquilla + instalaciones. Plan demo coherente.',
                    'porcentaje_descuento' => $def['desc'],
                    'es_vip' => $def['vip'],
                ]
            );
        }
    }

    private function seedBonoPacks(): void
    {
        foreach ([
            ['nombre' => 'Bono 8 Clases Grupales', 'num' => 8, 'precio' => 170],
            ['nombre' => 'Bono 12 Clases Grupales', 'num' => 12, 'precio' => 240],
            ['nombre' => 'Bono 20 Clases Mix', 'num' => 20, 'precio' => 380],
        ] as $def) {
            PackBono::query()->firstOrCreate(
                ['nombre' => $def['nombre']],
                ['num_clases' => $def['num'], 'precio' => $def['precio'], 'activo' => true]
            );
        }
    }

    private function seedRentalCatalog(): void
    {
        if (PriceSchema::query()->exists()) {
            return;
        }

        $this->call(PriceSchemaSeeder::class);

        $schemas = PriceSchema::query()->get();
        $names = ['Zurriola Soft 6\'2"', 'Zurriola Hard 6\'0"', 'Gros Soft 7\'0"', 'Mini Malibu 8\'0"'];
        foreach ($names as $i => $name) {
            $schema = $schemas[$i % $schemas->count()];
            Surfboard::query()->firstOrCreate(
                ['slug' => Str::slug($name)],
                [
                    'price_schema_id' => $schema->id,
                    'category' => str_contains($name, 'Hard') ? Surfboard::CATEGORY_HARD : Surfboard::CATEGORY_SOFT,
                    'is_active' => true,
                    'name' => $name,
                    'image_url' => json_encode(['surfboards/demo-'.($i + 1).'.jpg']),
                    'image_alt' => $name,
                    'description' => 'Tabla de alquiler demo — escuela S4.',
                    'altura' => 6.0 + ($i * 0.2),
                    'ancho' => 19.5 + $i,
                    'grosor' => 2.4,
                    'volumen' => 32 + ($i * 3),
                ]
            );
        }
    }

    private function seedProducts(): void
    {
        if (! Producto::query()->exists()) {
            $items = [
                ['Neopreno 3/2 mm', 89.00, 25, 10],
                ['Guantes surf invierno', 24.50, 40, 0],
                ['Parafina tropical', 8.00, 100, 5],
                ['Leash 6 pies', 32.00, 35, 15],
                ['Quillas FCS II', 45.00, 20, 0],
                ['Camiseta S4 Donostia', 28.00, 50, 20],
                ['Gorra escuela', 18.00, 30, 0],
                ['Cera base + top', 12.00, 60, 0],
            ];

            foreach ($items as [$nombre, $precio, $stock, $dto]) {
                Producto::query()->create([
                    'nombre' => $nombre,
                    'precio' => $precio,
                    'unidades' => $stock,
                    'descuento' => $dto,
                    'eliminado' => false,
                ]);
            }
        }

        $this->call(ProductImagesSeeder::class);
    }

    private function seedAdmin(): User
    {
        return User::query()->updateOrCreate(
            ['email' => 'admin@gmail.com'],
            [
                'nombre' => 'Admin',
                'apellido' => 'S4',
                'telefono' => '600111001',
                'password' => Hash::make(self::DEMO_PASSWORD),
                'role' => 'admin',
                'is_vip' => false,
                'email_verified_at' => now(),
            ]
        );
    }

    private function seedDemoUser(): User
    {
        return User::query()->updateOrCreate(
            ['email' => 'user@gmail.com'],
            [
                'nombre' => 'Ana',
                'apellido' => 'Garcia',
                'telefono' => '600222002',
                'password' => Hash::make(self::DEMO_PASSWORD),
                'role' => 'user',
                'is_vip' => true,
                'email_verified_at' => now(),
            ]
        );
    }

    /** @return list<User> */
    private function seedMonitors(): array
    {
        $monitors = [];
        foreach ([
            ['Maider', 'Instruktor', 'monitor1@gmail.com'],
            ['Jon', 'Monitor', 'monitor2@gmail.com'],
        ] as [$nombre, $apellido, $email]) {
            $monitors[] = User::query()->updateOrCreate(
                ['email' => $email],
                [
                    'nombre' => $nombre,
                    'apellido' => $apellido,
                    'telefono' => '600333'.random_int(100, 999),
                    'password' => Hash::make(self::DEMO_PASSWORD),
                    'role' => 'user',
                    'email_verified_at' => now(),
                ]
            );
        }

        return $monitors;
    }

    /** @return list<User> */
    private function seedExtraClients(int $count): array
    {
        $out = [];
        for ($i = 1; $i <= $count; $i++) {
            $out[] = User::query()->updateOrCreate(
                ['email' => sprintf('cliente%02d@gmail.com', $i)],
                [
                    'nombre' => 'Cliente',
                    'apellido' => "Demo{$i}",
                    'telefono' => '60044'.str_pad((string) $i, 4, '0', STR_PAD_LEFT),
                    'password' => Hash::make(self::DEMO_PASSWORD),
                    'role' => 'user',
                    'is_vip' => $i % 2 === 0,
                    'email_verified_at' => now(),
                ]
            );
        }

        return $out;
    }

    private function seedDemoUserLocker(User $user, PlanTaquilla $planMensual): void
    {
        PagoCuota::query()->where('user_id', $user->id)->delete();

        $planTrimestral = PlanTaquilla::query()->where('nombre', 'Taquilla Trimestral')->firstOrFail();
        $planAnualVip = PlanTaquilla::query()->where('nombre', 'Taquilla VIP Anual')->firstOrFail();

        $today = Carbon::now()->startOfDay();

        // 5 periodos mensuales ya consumidos (historial vencido).
        for ($i = 5; $i >= 1; $i--) {
            $start = (clone $today)->subMonths($i + 3)->startOfDay();
            $end = (clone $start)->addDays((int) $planMensual->duracion_dias - 1)->endOfDay();

            PagoCuota::query()->create([
                'user_id' => $user->id,
                'id_plan_pagado' => $planMensual->id,
                'monto_pagado_cents' => (int) $planMensual->precio_total_cents,
                'referencia_pago_externa' => 'SEED-VENC-'.$i,
                'status' => PagoCuota::STATUS_CONFIRMED,
                'is_checked' => true,
                'payment_proof_path' => 'taquilla-proofs/demo-user.pdf',
                'proof_uploaded_at' => $start->copy()->addHours(2),
                'reviewed_at' => $start->copy()->addDay(),
                'payment_method' => 'bizum',
                'periodo_inicio' => $start,
                'periodo_fin' => $end,
                'fecha_pago' => $start,
            ]);
        }

        // Plan activo trimestral (~67 días restantes de 90).
        $activeStart = (clone $today)->subDays(23)->startOfDay();
        $activeEnd = (clone $activeStart)->addDays((int) $planTrimestral->duracion_dias - 1)->endOfDay();

        PagoCuota::query()->create([
            'user_id' => $user->id,
            'id_plan_pagado' => $planTrimestral->id,
            'monto_pagado_cents' => (int) $planTrimestral->precio_total_cents,
            'referencia_pago_externa' => 'SEED-ACTIVO-TRIM',
            'status' => PagoCuota::STATUS_CONFIRMED,
            'is_checked' => true,
            'payment_proof_path' => 'taquilla-proofs/demo-user.pdf',
            'proof_uploaded_at' => $activeStart->copy()->addHours(2),
            'reviewed_at' => $activeStart->copy()->addDay(),
            'payment_method' => 'transferencia',
            'periodo_inicio' => $activeStart,
            'periodo_fin' => $activeEnd,
            'fecha_pago' => $activeStart,
        ]);

        // Plan anual VIP ya pagado, en cola para cuando acabe el trimestral.
        $queuedStart = (clone $activeEnd)->addDay()->startOfDay();
        $queuedEnd = (clone $queuedStart)->addDays((int) $planAnualVip->duracion_dias - 1)->endOfDay();

        PagoCuota::query()->create([
            'user_id' => $user->id,
            'id_plan_pagado' => $planAnualVip->id,
            'monto_pagado_cents' => (int) $planAnualVip->precio_total_cents,
            'referencia_pago_externa' => 'SEED-PREPARADO-VIP',
            'status' => PagoCuota::STATUS_CONFIRMED,
            'is_checked' => true,
            'payment_proof_path' => 'taquilla-proofs/demo-user.pdf',
            'proof_uploaded_at' => $today->copy()->subDays(2),
            'reviewed_at' => $today->copy()->subDay(),
            'payment_method' => 'bizum',
            'periodo_inicio' => $queuedStart,
            'periodo_fin' => $queuedEnd,
            'fecha_pago' => $today->copy()->subDays(2),
        ]);

        $user->update([
            'numeroTaquilla' => 42,
            'fecha_vencimiento_cuota' => $activeEnd,
            'id_plan_vigente' => $planTrimestral->id,
        ]);
    }

    /** @param list<PackBono> $packs */
    private function seedDemoUserBonos(User $user, array $packs, User $admin): void
    {
        $activePack = $packs[1] ?? $packs[0];
        $queuePack = $packs[2] ?? $activePack;

        UserBono::query()->where('user_id', $user->id)->delete();

        $activeBono = UserBono::query()->create([
            'user_id' => $user->id,
            'pack_id' => $activePack->id,
            'clases_restantes' => max(2, (int) $activePack->num_clases - 10),
            'status' => UserBono::STATUS_CONFIRMED,
            'payment_proof_path' => 'comprobantes_bonos/demo-user-bono.jpg',
            'reviewed_at' => Carbon::now()->subDays(20),
            'admin_notes' => 'Bono en consumo (seed coherente).',
            'created_at' => Carbon::now()->subDays(20),
        ]);

        UserBono::query()->create([
            'user_id' => $user->id,
            'pack_id' => $queuePack->id,
            'clases_restantes' => (int) $queuePack->num_clases,
            'status' => UserBono::STATUS_CONFIRMED,
            'payment_proof_path' => 'comprobantes_bonos/demo-user-bono-cola.jpg',
            'reviewed_at' => Carbon::now()->subDays(2),
            'admin_notes' => 'Bono en cola (seed coherente).',
            'created_at' => Carbon::now()->subDays(2),
        ]);

        CreditTransaction::query()->create([
            'user_id' => $user->id,
            'amount' => (int) $activePack->num_clases,
            'type' => CreditTransaction::TYPE_PURCHASE,
            'description' => "Compra {$activePack->nombre} (demo).",
        ]);

        CreditTransaction::query()->create([
            'user_id' => $user->id,
            'amount' => (int) $queuePack->num_clases,
            'type' => CreditTransaction::TYPE_PURCHASE,
            'description' => "Compra {$queuePack->nombre} en cola (demo).",
        ]);
    }

    /** @param list<Producto> $products */
    private function seedStoreForUser(User $user, array $products, bool $paidOrder = false): void
    {
        if ($paidOrder) {
            $picked = array_slice($products, 0, 3);
            $total = 0.0;
            $pedido = Pedido::query()->create([
                'user_id' => $user->id,
                'precio_total' => 0,
                'pagado' => true,
                'entregado' => false,
                'payment_proof_path' => 'payment-proofs/pedidos/demo-user.jpg',
            ]);

            foreach ($picked as $prod) {
                $cantidad = 1;
                $descuento = (float) $prod->descuento;
                $precioPagado = round((float) $prod->precio * (1 - $descuento / 100), 2);
                $total += $precioPagado * $cantidad;
                $pedido->productos()->attach($prod->id, [
                    'cantidad' => $cantidad,
                    'descuento_aplicado' => $descuento,
                    'precio_pagado' => $precioPagado,
                ]);
                $prod->decrement('unidades', $cantidad);
            }
            $pedido->update(['precio_total' => round($total, 2)]);
        }
    }

    /** @param list<Producto> $products */
    private function seedCarritoForUser(User $user, array $products): void
    {
        $carrito = Carrito::query()->firstOrCreate(['user_id' => $user->id]);
        $carrito->productos()->detach();
        foreach (array_slice($products, 0, 2) as $prod) {
            $carrito->productos()->attach($prod->id, ['cantidad' => 1]);
        }
    }

    /**
     * @param  list<User>  $monitors
     * @return list<Lesson>
     */
    private function seedAcademyLessons(array $monitors, User $admin): array
    {
        $lessons = [];
        $slots = [
            ['offset' => -14, 'hour' => 10, 'mod' => Lesson::MODALITY_GRUPAL, 'level' => Lesson::LEVEL_INICIACION],
            ['offset' => -7, 'hour' => 10, 'mod' => Lesson::MODALITY_GRUPAL, 'level' => Lesson::LEVEL_INTERMEDIO],
            ['offset' => -3, 'hour' => 10, 'mod' => Lesson::MODALITY_GRUPAL, 'level' => Lesson::LEVEL_INTERMEDIO],
            ['offset' => 3, 'hour' => 10, 'mod' => Lesson::MODALITY_GRUPAL, 'level' => Lesson::LEVEL_AVANZADO],
            ['offset' => 7, 'hour' => 16, 'mod' => Lesson::MODALITY_PARTICULAR, 'level' => Lesson::LEVEL_INTERMEDIO],
            ['offset' => 10, 'hour' => 9, 'mod' => Lesson::MODALITY_GRUPAL, 'level' => Lesson::LEVEL_INICIACION],
        ];

        foreach ($slots as $idx => $slot) {
            $start = Carbon::now()->addDays($slot['offset'])->setTime($slot['hour'], 0);
            $end = (clone $start)->addMinutes(90);
            $lesson = Lesson::query()->create([
                'title' => 'Clase '.ucfirst($slot['mod']).' — '.$start->format('d/m H:i'),
                'description' => 'Sesión demo Zurriola.',
                'starts_at' => $start,
                'ends_at' => $end,
                'type' => Lesson::TYPE_SURF,
                'modality' => $slot['mod'],
                'level' => $slot['level'],
                'max_slots' => $slot['mod'] === Lesson::MODALITY_PARTICULAR ? 1 : 8,
                'max_capacity' => $slot['mod'] === Lesson::MODALITY_PARTICULAR ? 1 : 8,
                'price' => 35,
                'currency' => 'EUR',
                'location' => 'Playa Zurriola',
                'is_private' => $slot['mod'] === Lesson::MODALITY_PARTICULAR,
                'status' => $start->isPast() ? Lesson::STATUS_COMPLETED : Lesson::STATUS_SCHEDULED,
            ]);

            $monitor = $monitors[$idx % count($monitors)];
            StaffAssignment::query()->create([
                'lesson_id' => $lesson->id,
                'user_id' => $monitor->id,
                'role' => StaffAssignment::ROLE_MONITOR,
            ]);

            if ($idx % 2 === 0) {
                StaffAssignment::query()->create([
                    'lesson_id' => $lesson->id,
                    'user_id' => $monitors[($idx + 1) % count($monitors)]->id,
                    'role' => 'fotografo',
                ]);
            }

            $lessons[] = $lesson;
        }

        return $lessons;
    }

    /**
     * Solicitud particular con pago manual pendiente (no consume bono).
     *
     * @param  list<Lesson>  $lessons
     */
    private function seedDemoUserPendingLessonRequest(User $user, array $lessons): void
    {
        $pendingLesson = $lessons[4] ?? $lessons[array_key_last($lessons)] ?? null;
        if ($pendingLesson === null) {
            return;
        }

        if (LessonUser::query()->where('lesson_id', $pendingLesson->id)->where('user_id', $user->id)->exists()) {
            return;
        }

        LessonUser::query()->create([
            'lesson_id' => $pendingLesson->id,
            'user_id' => $user->id,
            'party_size' => 1,
            'quantity' => 1,
            'status' => LessonUser::STATUS_PENDING,
            'payment_status' => PaymentStatus::Pending->value,
            'payment_method' => 'bizum',
            'payment_proof_path' => 'lesson-proofs/demo-pending.jpg',
            'proof_uploaded_at' => Carbon::now()->subHours(2),
            'expires_at' => Carbon::now()->addDays(2),
        ]);
    }

    /** @param list<User> $extras @param list<Lesson> $lessons */
    private function seedAcademyForExtras(array $extras, array $lessons): void
    {
        foreach ($extras as $i => $client) {
            if ((bool) ($client->is_vip ?? false)) {
                continue;
            }

            $lesson = $lessons[($i + 2) % count($lessons)];
            if (LessonUser::query()->where('lesson_id', $lesson->id)->where('user_id', $client->id)->exists()) {
                continue;
            }

            LessonUser::query()->create([
                'lesson_id' => $lesson->id,
                'user_id' => $client->id,
                'party_size' => 1,
                'quantity' => 1,
                'status' => $lesson->starts_at?->isPast() ? LessonUser::STATUS_ATTENDED : LessonUser::STATUS_CONFIRMED,
                'payment_status' => PaymentStatus::Confirmed->value,
                'payment_method' => 'transferencia',
                'confirmed_at' => now()->subDays(2),
            ]);
        }
    }

    /** @param list<User> $extras @param list<PackBono> $packs */
    private function seedBonosForExtras(array $extras, array $packs): void
    {
        foreach ($extras as $i => $client) {
            if (! $client->is_vip) {
                continue;
            }

            $pack = $packs[$i % count($packs)];
            $status = $i === 0 ? UserBono::STATUS_PENDING : UserBono::STATUS_CONFIRMED;
            UserBono::query()->create([
                'user_id' => $client->id,
                'pack_id' => $pack->id,
                'clases_restantes' => $status === UserBono::STATUS_CONFIRMED ? (int) $pack->num_clases - 2 : (int) $pack->num_clases,
                'status' => $status,
                'payment_proof_path' => $status === UserBono::STATUS_PENDING ? 'comprobantes_bonos/pending.jpg' : 'comprobantes_bonos/ok.jpg',
            ]);
        }
    }

    /** @param list<User> $extras @param list<PlanTaquilla> $plans */
    private function seedLockersForExtras(array $extras, array $plans): void
    {
        foreach ($extras as $i => $client) {
            $plan = $plans[$i % count($plans)];
            $confirmed = $i % 3 !== 0;
            $start = Carbon::now()->subDays(5 + $i);
            $end = (clone $start)->addDays((int) $plan->duracion_dias);

            PagoCuota::query()->create([
                'user_id' => $client->id,
                'id_plan_pagado' => $plan->id,
                'monto_pagado_cents' => (int) $plan->precio_total_cents,
                'referencia_pago_externa' => 'REF-'.Str::upper(Str::random(8)),
                'status' => $confirmed ? PagoCuota::STATUS_CONFIRMED : PagoCuota::STATUS_PENDING,
                'payment_proof_path' => $confirmed ? 'taquilla-proofs/extra.pdf' : null,
                'proof_uploaded_at' => $confirmed ? now()->subDay() : null,
                'payment_method' => $confirmed ? 'transferencia' : null,
                'periodo_inicio' => $start,
                'periodo_fin' => $end,
                'fecha_pago' => $confirmed ? $start : null,
            ]);

            if ($confirmed) {
                $client->update([
                    'numeroTaquilla' => 100 + $i,
                    'fecha_vencimiento_cuota' => $end,
                    'id_plan_vigente' => $plan->id,
                ]);
            }
        }
    }

    /** @param list<User> $clients @param list<Surfboard> $boards */
    private function seedRentals(array $clients, array $boards): void
    {
        $service = app(BookingService::class);
        $boardIndex = 0;

        foreach ($clients as $idx => $client) {
            $board = $boards[$boardIndex % count($boards)];
            $boardIndex++;

            $start = Carbon::now()->addDays(2 + ($idx * 3))->setTime(9, 0);
            $end = (clone $start)->addHours(24);

            DB::transaction(function () use ($service, $board, $start, $end, $client, $idx): void {
                if (! $service->isAvailable((int) $board->id, $start, $end)) {
                    return;
                }

                $schema = $board->priceSchema;
                if ($schema === null) {
                    return;
                }

                $pricing = $service->resolvePricing($schema, $start, $end);
                $confirmed = $idx % 2 === 0;

                Booking::query()->create([
                    'surfboard_id' => $board->id,
                    'user_id' => $client->id,
                    'client_name' => trim($client->nombre.' '.$client->apellido),
                    'client_email' => $client->email,
                    'client_phone' => $client->telefono,
                    'start_date' => $start,
                    'end_date' => $end,
                    'expires_at' => now()->addDays(7),
                    'status' => $confirmed ? Booking::STATUS_CONFIRMED : Booking::STATUS_PENDING,
                    'payment_status' => $confirmed ? PaymentStatus::Confirmed->value : PaymentStatus::Pending->value,
                    'payment_proof_path' => $confirmed ? 'payment-proofs/rentals/demo.jpg' : null,
                    'proof_uploaded_at' => $confirmed ? now()->subDay() : null,
                    'payment_method' => $confirmed ? 'bizum' : null,
                    'total_price' => $pricing['total_price'],
                    'deposit_amount' => $pricing['deposit_amount'],
                ]);
            });
        }
    }

    private function seedPaymentWebhooks(User $demoUser): void
    {
        $booking = Booking::query()->where('user_id', $demoUser->id)->first();
        if ($booking !== null) {
            PaymentWebhookIdempotency::query()->create([
                'transaction_id' => 'stripe_demo_'.Str::lower(Str::random(12)),
                'payable_type' => Booking::class,
                'payable_id' => $booking->id,
                'amount' => (float) $booking->deposit_amount,
                'status' => 'processed',
            ]);
        }

        $pendingEnrollment = LessonUser::query()
            ->where('user_id', $demoUser->id)
            ->where('payment_status', PaymentStatus::Pending->value)
            ->first();

        if ($pendingEnrollment !== null) {
            PaymentWebhookIdempotency::query()->create([
                'transaction_id' => 'redsys_demo_'.Str::lower(Str::random(12)),
                'payable_type' => LessonUser::class,
                'payable_id' => $pendingEnrollment->id,
                'amount' => 35.00,
                'status' => 'pending',
            ]);
        }
    }

    private function seedEmergencyKeyHistory(User $demoUser, User $admin): void
    {
        EmergencyKeyRequest::query()->create([
            'user_id' => $demoUser->id,
            'requested_at' => Carbon::now()->subDays(30),
            'resolved_code_shown' => '1234',
            'admin_key_deactivated_at' => Carbon::now()->subDays(30)->addMinutes(15),
            'admin_key_deactivated_by' => $admin->id,
        ]);
    }
}
