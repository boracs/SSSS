<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\PaymentStatus;
use App\Enums\SecondHandStatus;
use App\Models\AttendanceNote;
use App\Models\BonoConsumption;
use App\Models\Booking;
use App\Models\Carrito;
use App\Models\Lesson;
use App\Models\LessonUser;
use App\Models\PackBono;
use App\Models\PagoCuota;
use App\Models\Pedido;
use App\Models\PlanTaquilla;
use App\Models\PriceSchema;
use App\Models\Producto;
use App\Models\SecondHandBoard;
use App\Models\StaffAssignment;
use App\Models\Surfboard;
use App\Models\User;
use App\Models\UserBono;
use App\Support\MoneyCents;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Dataset de sandbox “rico” para maider_0 (BD de desarrollo).
 *
 * Volúmenes:
 * - 5 clientes (incluye user@gmail.com) + admin@gmail.com + 2 monitores
 * - ~30 productos, 15 tablas alquiler, 45 segunda mano
 * - Taquillas, bonos, clases pasadas/futuras, feedbacks, alquileres, pedidos
 *
 * Contraseña de TODOS: 12121212
 */
final class SandboxRandomDemoSeeder extends Seeder
{
    private const PASSWORD = '12121212';

    /** @var list<string> */
    private const FEEDBACKS = [
        'Muy buena posición de base. Sigue bajando un poco el centro de gravedad al rematar.',
        'Progreso claro en el remado: más ritmo y menos pausas. Próximo foco: timing de pop-up.',
        'Excelente actitud. Trabaja la mirada hacia donde quieres dirigir la tabla.',
        'Buen control en la espuma. En olas verdes, compromete antes el peso delantero.',
        'Mejora notable en el equilibrio. Repasa la transferencia de peso pie trasero → delantero.',
        'Gran sesión. Mantén la calma en la toma de la ola y evita mirar la tabla al levantarte.',
        'Bien el posicionamiento en el pico. Ahora prioriza lineas más largas y menos giros forzados.',
        'Buen trabajo de seguridad y respeto en el lineup. Técnicamente: quillas más limpias en el rail.',
    ];

    public function run(): void
    {
        DB::transaction(function (): void {
            $admin = $this->seedAdmin();
            $clients = $this->seedClients(); // 5 clientes, índice 0 = user@gmail.com
            $monitors = $this->seedMonitors();

            $plans = $this->seedLockerPlans();
            $packs = $this->seedBonoPacks();
            $products = $this->seedProducts(30);
            $boards = $this->seedRentalBoards(15);
            $this->seedSecondHandBoards(45);

            $this->assignLockers($clients, $plans);
            $bonos = $this->assignBonos($clients, $packs);
            $lessons = $this->seedLessons($monitors);
            $this->enrollClients($clients, $lessons, $bonos, $monitors);
            $this->seedRentals($clients, $boards);
            $this->seedStoreActivity($clients, $products);
            $this->seedCarts($clients, $products);

            $this->command?->info('SandboxRandomDemoSeeder OK');
            $this->command?->info('  admin@gmail.com / user@gmail.com → password '.self::PASSWORD);
            $this->command?->info('  clientes: '.count($clients).' · monitores: '.count($monitors));
            $this->command?->info('  productos: '.count($products).' · alquiler: '.count($boards).' · 2ª mano: 45');
        });
    }

    private function seedAdmin(): User
    {
        return User::query()->updateOrCreate(
            ['email' => 'admin@gmail.com'],
            [
                'nombre' => 'Admin',
                'apellido' => 'S4',
                'telefono' => '600111001',
                'password' => Hash::make(self::PASSWORD),
                'role' => 'admin',
                'is_vip' => false,
                'email_verified_at' => now(),
            ]
        );
    }

    /** @return list<User> exactamente 5 clientes */
    private function seedClients(): array
    {
        $defs = [
            ['user@gmail.com', 'Ana', 'Garcia', true, '600222002'],
            ['cliente01@gmail.com', 'Borja', 'Lopez', true, '600222011'],
            ['cliente02@gmail.com', 'Elena', 'Ruiz', false, '600222012'],
            ['cliente03@gmail.com', 'Iker', 'Mendez', true, '600222013'],
            ['cliente04@gmail.com', 'Lucia', 'Santos', false, '600222014'],
        ];

        $out = [];
        foreach ($defs as [$email, $nombre, $apellido, $vip, $tel]) {
            $out[] = User::query()->updateOrCreate(
                ['email' => $email],
                [
                    'nombre' => $nombre,
                    'apellido' => $apellido,
                    'telefono' => $tel,
                    'password' => Hash::make(self::PASSWORD),
                    'role' => 'user',
                    'is_vip' => $vip,
                    'email_verified_at' => now(),
                ]
            );
        }

        return $out;
    }

    /** @return list<User> */
    private function seedMonitors(): array
    {
        $defs = [
            ['monitor1@gmail.com', 'Maider', 'Instruktor'],
            ['monitor2@gmail.com', 'Jon', 'Monitor'],
        ];

        $out = [];
        foreach ($defs as [$email, $nombre, $apellido]) {
            $out[] = User::query()->updateOrCreate(
                ['email' => $email],
                [
                    'nombre' => $nombre,
                    'apellido' => $apellido,
                    'telefono' => '600333'.random_int(100, 999),
                    'password' => Hash::make(self::PASSWORD),
                    'role' => 'user',
                    'is_vip' => false,
                    'email_verified_at' => now(),
                ]
            );
        }

        return $out;
    }

    /** @return list<PlanTaquilla> */
    private function seedLockerPlans(): array
    {
        $defs = [
            ['Taquilla Mensual', 30, 60, false, 45],
            ['Taquilla Trimestral', 90, 165, false, 45],
            ['Taquilla VIP Anual', 365, 480, true, 50],
        ];

        $out = [];
        foreach ($defs as [$nombre, $dias, $eur, $vip, $desc]) {
            $out[] = PlanTaquilla::query()->firstOrCreate(
                ['nombre' => $nombre],
                [
                    'duracion_dias' => $dias,
                    'precio_total_cents' => MoneyCents::eurosToCents($eur),
                    'activo' => true,
                    'descripcion' => 'Plan demo sandbox S4.',
                    'porcentaje_descuento' => $desc,
                    'es_vip' => $vip,
                ]
            );
        }

        return $out;
    }

    /** @return list<PackBono> */
    private function seedBonoPacks(): array
    {
        $defs = [
            ['Bono 8 Clases Grupales', 8, 170],
            ['Bono 12 Clases Grupales', 12, 240],
            ['Bono 20 Clases Mix', 20, 380],
        ];

        $out = [];
        foreach ($defs as [$nombre, $num, $precio]) {
            $out[] = PackBono::query()->firstOrCreate(
                ['nombre' => $nombre],
                ['num_clases' => $num, 'precio' => $precio, 'activo' => true]
            );
        }

        return $out;
    }

    /** @return list<Producto> */
    private function seedProducts(int $count): array
    {
        $names = [
            'Neopreno', 'Leash', 'Parafina', 'Quillas', 'Camiseta S4', 'Gorra', 'Poncho',
            'Botines', 'Guantes', 'Gorro neopreno', 'Wax tropical', 'Wax frío', 'Mochila',
            'Funda tabla', 'Stickers S4', 'Toalla', 'Crema solar', 'Gafas', 'Calcetines', 'Sudadera',
        ];

        $out = [];
        for ($i = 1; $i <= $count; $i++) {
            $base = $names[($i - 1) % count($names)];
            $out[] = Producto::query()->firstOrCreate(
                ['nombre' => sprintf('%s Sandbox %02d', $base, $i)],
                [
                    'precio' => round(random_int(800, 12000) / 100, 2),
                    'unidades' => random_int(10, 80),
                    'descuento' => [0, 0, 5, 10, 15][array_rand([0, 0, 5, 10, 15])],
                    'eliminado' => false,
                ]
            );
        }

        return $out;
    }

    /** @return list<Surfboard> */
    private function seedRentalBoards(int $count): array
    {
        if (! PriceSchema::query()->exists()) {
            $this->call(PriceSchemaSeeder::class);
        }

        $schemas = PriceSchema::query()->get();
        if ($schemas->isEmpty()) {
            $schemas = collect([
                PriceSchema::query()->create([
                    'name' => 'Schema Sandbox',
                    'price_1h' => 12, 'price_2h' => 20, 'price_4h' => 35,
                    'price_12h' => 50, 'price_24h' => 70, 'price_48h' => 120,
                    'price_72h' => 160, 'price_week' => 300,
                ]),
            ]);
        }

        $out = [];
        for ($i = 1; $i <= $count; $i++) {
            $schema = $schemas[($i - 1) % $schemas->count()];
            $name = sprintf('Tabla Alquiler S4 %02d', $i);
            $out[] = Surfboard::query()->firstOrCreate(
                ['slug' => Str::slug($name)],
                [
                    'price_schema_id' => $schema->id,
                    'category' => $i % 2 === 0 ? Surfboard::CATEGORY_SOFT : Surfboard::CATEGORY_HARD,
                    'is_active' => true,
                    'name' => $name,
                    'image_url' => json_encode(['surfboards/demo-'.(($i % 4) + 1).'.jpg']),
                    'image_alt' => $name,
                    'description' => 'Tabla de alquiler sandbox Zurriola.',
                    'altura' => 6.0 + ($i * 0.05),
                    'ancho' => 19.5 + ($i * 0.05),
                    'grosor' => 2.3 + ($i * 0.01),
                    'volumen' => 30 + $i,
                ]
            );
        }

        return $out;
    }

    private function seedSecondHandBoards(int $count): void
    {
        $existing = SecondHandBoard::query()->count();
        if ($existing >= $count) {
            return;
        }

        $need = $count - $existing;
        $sold = (int) floor($need * 0.2);
        $available = $need - $sold;

        if ($available > 0) {
            SecondHandBoard::factory()->count($available)->create();
        }
        if ($sold > 0) {
            SecondHandBoard::factory()->sold()->count($sold)->create([
                'status' => SecondHandStatus::SOLD,
            ]);
        }
    }

    /**
     * @param  list<User>  $clients
     * @param  list<PlanTaquilla>  $plans
     */
    private function assignLockers(array $clients, array $plans): void
    {
        foreach ($clients as $i => $client) {
            // Alternar: con taquilla / sin taquilla
            if ($i === 2 || $i === 4) {
                continue;
            }

            $plan = $plans[$i % count($plans)];
            $start = Carbon::now()->subDays(10 + $i)->startOfDay();
            $end = (clone $start)->addDays((int) $plan->duracion_dias - 1)->endOfDay();

            PagoCuota::query()->updateOrCreate(
                [
                    'user_id' => $client->id,
                    'referencia_pago_externa' => 'SANDBOX-LOCKER-'.$client->id,
                ],
                [
                    'id_plan_pagado' => $plan->id,
                    'monto_pagado_cents' => (int) $plan->precio_total_cents,
                    'status' => PagoCuota::STATUS_CONFIRMED,
                    'is_checked' => true,
                    'payment_proof_path' => 'taquilla-proofs/sandbox.pdf',
                    'proof_uploaded_at' => $start->copy()->addHours(2),
                    'reviewed_at' => $start->copy()->addDay(),
                    'payment_method' => 'bizum',
                    'periodo_inicio' => $start,
                    'periodo_fin' => $end,
                    'fecha_pago' => $start,
                ]
            );

            $client->update([
                'numeroTaquilla' => 40 + $i,
                'fecha_vencimiento_cuota' => $end,
                'id_plan_vigente' => $plan->id,
            ]);
        }

        // Un pago pendiente de taquilla para demos de cola admin
        $pendingClient = $clients[2];
        PagoCuota::query()->updateOrCreate(
            [
                'user_id' => $pendingClient->id,
                'referencia_pago_externa' => 'SANDBOX-LOCKER-PENDING',
            ],
            [
                'id_plan_pagado' => $plans[0]->id,
                'monto_pagado_cents' => (int) $plans[0]->precio_total_cents,
                'status' => PagoCuota::STATUS_PENDING,
                'is_checked' => false,
                'payment_proof_path' => 'taquilla-proofs/pending.pdf',
                'proof_uploaded_at' => now()->subHours(3),
                'payment_method' => 'transferencia',
                'periodo_inicio' => now()->startOfDay(),
                'periodo_fin' => now()->addDays(30)->endOfDay(),
            ]
        );
    }

    /**
     * @param  list<User>  $clients
     * @param  list<PackBono>  $packs
     * @return array<int, UserBono> keyed by user_id
     */
    private function assignBonos(array $clients, array $packs): array
    {
        $byUser = [];

        foreach ($clients as $i => $client) {
            if (! $client->is_vip) {
                continue;
            }

            $pack = $packs[$i % count($packs)];
            $consumed = min(4, max(1, (int) $pack->num_clases - 3));
            $remaining = (int) $pack->num_clases - $consumed;

            $bono = UserBono::query()->updateOrCreate(
                [
                    'user_id' => $client->id,
                    'pack_id' => $pack->id,
                    'admin_notes' => 'Bono sandbox activo',
                ],
                [
                    'clases_restantes' => $remaining,
                    'status' => UserBono::STATUS_CONFIRMED,
                    'payment_proof_path' => 'comprobantes_bonos/sandbox.jpg',
                    'reviewed_at' => now()->subDays(15),
                ]
            );

            $byUser[$client->id] = $bono;
        }

        // Un bono pendiente de revisión
        $nonVip = collect($clients)->first(fn (User $u) => ! $u->is_vip) ?? $clients[array_key_last($clients)];
        UserBono::query()->updateOrCreate(
            [
                'user_id' => $nonVip->id,
                'admin_notes' => 'Bono sandbox pendiente',
            ],
            [
                'pack_id' => $packs[0]->id,
                'clases_restantes' => (int) $packs[0]->num_clases,
                'status' => UserBono::STATUS_PENDING,
                'payment_proof_path' => 'comprobantes_bonos/pending.jpg',
            ]
        );

        return $byUser;
    }

    /**
     * @param  list<User>  $monitors
     * @return list<Lesson>
     */
    private function seedLessons(array $monitors): array
    {
        // Limpiar clases sandbox previas para poder re-sembrar
        $legacy = Lesson::query()->where('internal_notes', 'sandbox-random-demo')->pluck('id');
        if ($legacy->isNotEmpty()) {
            StaffAssignment::query()->whereIn('lesson_id', $legacy)->delete();
            LessonUser::query()->whereIn('lesson_id', $legacy)->delete();
            BonoConsumption::query()->whereIn('lesson_id', $legacy)->delete();
            AttendanceNote::query()
                ->where('reservation_type', LessonUser::class)
                ->whereIn('reservation_id', LessonUser::query()->whereIn('lesson_id', $legacy)->pluck('id'))
                ->delete();
            Lesson::query()->whereIn('id', $legacy)->delete();
        }

        $slots = [
            // pasadas
            ['offset' => -21, 'hour' => 10, 'mod' => Lesson::MODALITY_GRUPAL, 'level' => Lesson::LEVEL_INICIACION],
            ['offset' => -14, 'hour' => 10, 'mod' => Lesson::MODALITY_GRUPAL, 'level' => Lesson::LEVEL_INTERMEDIO],
            ['offset' => -10, 'hour' => 16, 'mod' => Lesson::MODALITY_GRUPAL, 'level' => Lesson::LEVEL_INICIACION],
            ['offset' => -7, 'hour' => 10, 'mod' => Lesson::MODALITY_PARTICULAR, 'level' => Lesson::LEVEL_INTERMEDIO],
            ['offset' => -3, 'hour' => 9, 'mod' => Lesson::MODALITY_GRUPAL, 'level' => Lesson::LEVEL_AVANZADO],
            // futuras
            ['offset' => 2, 'hour' => 10, 'mod' => Lesson::MODALITY_GRUPAL, 'level' => Lesson::LEVEL_INICIACION],
            ['offset' => 5, 'hour' => 16, 'mod' => Lesson::MODALITY_GRUPAL, 'level' => Lesson::LEVEL_INTERMEDIO],
            ['offset' => 8, 'hour' => 10, 'mod' => Lesson::MODALITY_PARTICULAR, 'level' => Lesson::LEVEL_INTERMEDIO],
            ['offset' => 12, 'hour' => 9, 'mod' => Lesson::MODALITY_GRUPAL, 'level' => Lesson::LEVEL_AVANZADO],
            ['offset' => 16, 'hour' => 17, 'mod' => Lesson::MODALITY_GRUPAL, 'level' => Lesson::LEVEL_INICIACION],
        ];

        $lessons = [];
        foreach ($slots as $idx => $slot) {
            $start = Carbon::now()->addDays($slot['offset'])->setTime($slot['hour'], 0, 0);
            $end = (clone $start)->addMinutes(90);
            $isPast = $start->isPast();

            $lesson = Lesson::query()->create([
                'title' => sprintf('Sandbox %s %s', ucfirst($slot['mod']), $start->format('d/m H:i')),
                'description' => 'Clase demo Zurriola (sandbox).',
                'starts_at' => $start,
                'ends_at' => $end,
                'type' => Lesson::TYPE_SURF,
                'modality' => $slot['mod'],
                'level' => $slot['level'],
                'max_slots' => $slot['mod'] === Lesson::MODALITY_PARTICULAR ? 1 : 8,
                'max_capacity' => $slot['mod'] === Lesson::MODALITY_PARTICULAR ? 1 : 8,
                'price' => $slot['mod'] === Lesson::MODALITY_PARTICULAR ? 55 : 35,
                'currency' => 'EUR',
                'location' => 'Playa Zurriola',
                'internal_notes' => 'sandbox-random-demo',
                'is_private' => $slot['mod'] === Lesson::MODALITY_PARTICULAR,
                'status' => $isPast ? Lesson::STATUS_COMPLETED : Lesson::STATUS_SCHEDULED,
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
                    'role' => StaffAssignment::ROLE_FOTOGRAFO,
                ]);
            }

            $lessons[] = $lesson;
        }

        return $lessons;
    }

    /**
     * @param  list<User>  $clients
     * @param  list<Lesson>  $lessons
     * @param  array<int, UserBono>  $bonosByUser
     * @param  list<User>  $monitors
     */
    private function enrollClients(array $clients, array $lessons, array $bonosByUser, array $monitors): void
    {
        $past = array_values(array_filter($lessons, fn (Lesson $l) => $l->starts_at?->isPast()));
        $future = array_values(array_filter($lessons, fn (Lesson $l) => ! $l->starts_at?->isPast()));

        foreach ($clients as $i => $client) {
            // Clase pasada asistida
            if (isset($past[$i % max(1, count($past))])) {
                $lesson = $past[$i % count($past)];
                $enrollment = LessonUser::query()->create([
                    'lesson_id' => $lesson->id,
                    'user_id' => $client->id,
                    'party_size' => 1,
                    'quantity' => 1,
                    'credits_locked' => isset($bonosByUser[$client->id]) ? 1 : 0,
                    'status' => LessonUser::STATUS_ATTENDED,
                    'payment_status' => PaymentStatus::Confirmed->value,
                    'payment_method' => isset($bonosByUser[$client->id]) ? 'bono_vip' : 'transferencia',
                    'confirmed_at' => $lesson->starts_at?->copy()->subDay(),
                ]);

                if (isset($bonosByUser[$client->id])) {
                    $bono = $bonosByUser[$client->id];
                    BonoConsumption::query()->create([
                        'user_bono_id' => $bono->id,
                        'user_id' => $client->id,
                        'lesson_id' => $lesson->id,
                        'remaining_after' => max(0, (int) $bono->clases_restantes),
                        'consumed_at' => $lesson->starts_at,
                    ]);
                }

                $monitor = $monitors[$i % count($monitors)];
                AttendanceNote::query()->create([
                    'user_id' => $client->id,
                    'reservation_type' => LessonUser::class,
                    'reservation_id' => $enrollment->id,
                    'body' => self::FEEDBACKS[$i % count(self::FEEDBACKS)],
                    'is_visible_to_student' => true,
                    'admin_id' => $monitor->id,
                ]);
            }

            // Reserva futura confirmada
            if (isset($future[$i % max(1, count($future))])) {
                $lesson = $future[$i % count($future)];
                LessonUser::query()->firstOrCreate(
                    [
                        'lesson_id' => $lesson->id,
                        'user_id' => $client->id,
                    ],
                    [
                        'party_size' => 1,
                        'quantity' => 1,
                        'credits_locked' => isset($bonosByUser[$client->id]) ? 1 : 0,
                        'status' => LessonUser::STATUS_CONFIRMED,
                        'payment_status' => PaymentStatus::Confirmed->value,
                        'payment_method' => isset($bonosByUser[$client->id]) ? 'bono_vip' : 'transferencia',
                        'confirmed_at' => now()->subHours(6),
                    ]
                );
            }
        }

        // Una solicitud pendiente (pago manual) para cola admin
        if ($future !== []) {
            $pendingLesson = $future[array_key_last($future)];
            $pendingUser = $clients[array_key_last($clients)];
            LessonUser::query()->firstOrCreate(
                [
                    'lesson_id' => $pendingLesson->id,
                    'user_id' => $pendingUser->id,
                    'status' => LessonUser::STATUS_PENDING,
                ],
                [
                    'party_size' => 1,
                    'quantity' => 1,
                    'payment_status' => PaymentStatus::Pending->value,
                    'payment_method' => 'bizum',
                    'payment_proof_path' => 'lesson-proofs/sandbox-pending.jpg',
                    'proof_uploaded_at' => now()->subHours(2),
                    'expires_at' => now()->addDays(2),
                ]
            );
        }
    }

    /**
     * @param  list<User>  $clients
     * @param  list<Surfboard>  $boards
     */
    private function seedRentals(array $clients, array $boards): void
    {
        if ($boards === []) {
            return;
        }

        foreach ($clients as $i => $client) {
            if ($i % 2 === 1) {
                continue; // no todos alquilan
            }

            $board = $boards[$i % count($boards)];
            $start = Carbon::now()->addDays($i + 1)->setTime(10, 0);
            $end = (clone $start)->addHours(4);

            Booking::query()->updateOrCreate(
                [
                    'user_id' => $client->id,
                    'surfboard_id' => $board->id,
                    'start_date' => $start,
                ],
                [
                    'client_name' => trim($client->nombre.' '.$client->apellido),
                    'client_email' => $client->email,
                    'client_phone' => $client->telefono,
                    'end_date' => $end,
                    'status' => Booking::STATUS_CONFIRMED,
                    'payment_status' => PaymentStatus::Confirmed->value,
                    'payment_method' => 'card',
                    'total_price' => 35 + ($i * 5),
                    'deposit_amount' => 10,
                    'reviewed_at' => now()->subDay(),
                ]
            );
        }

        // Alquiler pasado completado
        $pastBoard = $boards[0];
        $pastUser = $clients[0];
        Booking::query()->updateOrCreate(
            [
                'user_id' => $pastUser->id,
                'surfboard_id' => $pastBoard->id,
                'admin_notes' => 'sandbox-past-rental',
            ],
            [
                'client_name' => trim($pastUser->nombre.' '.$pastUser->apellido),
                'client_email' => $pastUser->email,
                'client_phone' => $pastUser->telefono,
                'start_date' => Carbon::now()->subDays(8)->setTime(10, 0),
                'end_date' => Carbon::now()->subDays(8)->setTime(14, 0),
                'status' => Booking::STATUS_COMPLETED,
                'payment_status' => PaymentStatus::Confirmed->value,
                'payment_method' => 'card',
                'total_price' => 40,
                'deposit_amount' => 10,
                'reviewed_at' => Carbon::now()->subDays(8),
            ]
        );
    }

    /**
     * @param  list<User>  $clients
     * @param  list<Producto>  $products
     */
    private function seedStoreActivity(array $clients, array $products): void
    {
        if ($products === []) {
            return;
        }

        foreach ($clients as $i => $client) {
            $paid = $i % 2 === 0;
            $picked = array_slice($products, $i * 2, 2);
            if ($picked === []) {
                $picked = [$products[0]];
            }

            $total = 0.0;
            $pedido = Pedido::query()->create([
                'user_id' => $client->id,
                'precio_total' => 0,
                'pagado' => $paid,
                'entregado' => $paid && $i === 0,
                'payment_method' => $paid ? 'card' : null,
                'payment_proof_path' => $paid ? null : 'payment-proofs/pedidos/pending.jpg',
            ]);

            foreach ($picked as $prod) {
                $descuento = (float) ($prod->descuento ?? 0);
                $precioPagado = round((float) $prod->precio * (1 - $descuento / 100), 2);
                $total += $precioPagado;
                $pedido->productos()->attach($prod->id, [
                    'cantidad' => 1,
                    'descuento_aplicado' => $descuento,
                    'precio_pagado' => $precioPagado,
                ]);
            }

            $pedido->update(['precio_total' => round($total, 2)]);
        }
    }

    /**
     * @param  list<User>  $clients
     * @param  list<Producto>  $products
     */
    private function seedCarts(array $clients, array $products): void
    {
        if (count($products) < 2) {
            return;
        }

        $user = $clients[0];
        $carrito = Carrito::query()->firstOrCreate(['user_id' => $user->id]);
        $carrito->productos()->detach();
        foreach (array_slice($products, 5, 2) as $prod) {
            $carrito->productos()->attach($prod->id, ['cantidad' => 1]);
        }
    }
}
