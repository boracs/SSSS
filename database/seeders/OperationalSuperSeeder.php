<?php

namespace Database\Seeders;

use App\Models\AttendanceNote;
use App\Models\Booking;
use App\Models\BonoConsumption;
use App\Models\Carrito;
use App\Models\CreditTransaction;
use App\Models\Lesson;
use App\Models\LessonUser;
use App\Models\PackBono;
use App\Models\PagoCuota;
use App\Models\Pedido;
use App\Models\PlanTaquilla;
use App\Models\PriceSchema;
use App\Models\Producto;
use App\Models\StaffAssignment;
use App\Models\Surfboard;
use App\Models\User;
use App\Models\UserBono;
use App\Services\BookingService;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class OperationalSuperSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            $admin = User::query()->firstOrCreate(
                ['email' => 'admin.superseed@masquesurf.local'],
                [
                    'nombre' => 'Admin',
                    'apellido' => 'Superseed',
                    'telefono' => '600000001',
                    'password' => Hash::make('password'),
                    'role' => 'admin',
                ]
            );

            $students = $this->createStudents(20);
            $staff = $this->createStaff(6);
            $products = $this->createProducts(24);
            $plans = $this->createLockerPlans();
            $packs = $this->createBonoPacks();
            [$schemas, $boards] = $this->createRentalInventory(4, 14);

            $this->seedStoreFlow($students, $products);
            $lessons = $this->seedAcademyFlow($students, $staff, $admin);
            $this->seedBonoFlow($students, $packs, $lessons);
            $this->seedLockerFlow($students, $plans);
            $this->seedRentalFlow($students, $boards, $schemas);
        });
    }

    private function createStudents(int $count): array
    {
        $out = [];
        for ($i = 1; $i <= $count; $i++) {
            $out[] = User::query()->firstOrCreate(
                ['email' => sprintf('cliente.superseed%02d@masquesurf.local', $i)],
                [
                    'nombre' => 'Cliente',
                    'apellido' => "Superseed{$i}",
                    'telefono' => '6'.str_pad((string) random_int(10000000, 99999999), 8, '0', STR_PAD_LEFT),
                    'password' => Hash::make('password'),
                    'role' => 'user',
                    'is_vip' => $i % 2 === 0,
                ]
            );
        }

        return $out;
    }

    private function createStaff(int $count): array
    {
        $out = [];
        for ($i = 1; $i <= $count; $i++) {
            $out[] = User::query()->firstOrCreate(
                ['email' => sprintf('staff.superseed%02d@masquesurf.local', $i)],
                [
                    'nombre' => 'Staff',
                    'apellido' => "Operativo{$i}",
                    'telefono' => '6'.str_pad((string) random_int(10000000, 99999999), 8, '0', STR_PAD_LEFT),
                    'password' => Hash::make('password'),
                    'role' => 'user',
                ]
            );
        }

        return $out;
    }

    private function createProducts(int $count): array
    {
        $out = [];
        for ($i = 1; $i <= $count; $i++) {
            $out[] = Producto::query()->firstOrCreate(
                ['nombre' => sprintf('Producto Superseed %02d', $i)],
                [
                    'precio' => random_int(15, 140),
                    'unidades' => random_int(30, 120),
                    'descuento' => random_int(0, 25),
                    'eliminado' => false,
                ]
            );
        }

        return $out;
    }

    private function createLockerPlans(): array
    {
        $defs = [
            ['nombre' => 'Plan Mensual Superseed', 'duracion_dias' => 30, 'precio_total' => 60],
            ['nombre' => 'Plan Trimestral Superseed', 'duracion_dias' => 90, 'precio_total' => 165],
            ['nombre' => 'Plan Semestral Superseed', 'duracion_dias' => 180, 'precio_total' => 300],
            ['nombre' => 'Plan Anual Superseed', 'duracion_dias' => 365, 'precio_total' => 480],
        ];

        return array_map(
            fn (array $def) => PlanTaquilla::query()->firstOrCreate(
                ['nombre' => $def['nombre']],
                [
                    'duracion_dias' => $def['duracion_dias'],
                    'precio_total' => $def['precio_total'],
                    'activo' => true,
                ]
            ),
            $defs
        );
    }

    private function createBonoPacks(): array
    {
        $defs = [
            ['nombre' => 'Bono 8 clases Superseed', 'num_clases' => 8, 'precio' => 170],
            ['nombre' => 'Bono 12 clases Superseed', 'num_clases' => 12, 'precio' => 240],
            ['nombre' => 'Bono 20 clases Superseed', 'num_clases' => 20, 'precio' => 380],
        ];

        return array_map(
            fn (array $def) => PackBono::query()->firstOrCreate(
                ['nombre' => $def['nombre']],
                [
                    'num_clases' => $def['num_clases'],
                    'precio' => $def['precio'],
                    'activo' => true,
                ]
            ),
            $defs
        );
    }

    private function createRentalInventory(int $schemaCount, int $boardCount): array
    {
        $schemas = [];
        for ($i = 1; $i <= $schemaCount; $i++) {
            $schemas[] = PriceSchema::query()->firstOrCreate(
                ['name' => sprintf('Schema Superseed %02d', $i)],
                [
                    'price_1h' => 10 + $i,
                    'price_2h' => 17 + $i,
                    'price_4h' => 30 + $i,
                    'price_12h' => 45 + $i,
                    'price_24h' => 60 + $i,
                    'price_48h' => 110 + $i,
                    'price_72h' => 150 + $i,
                    'price_week' => 280 + $i,
                ]
            );
        }

        $boards = [];
        for ($i = 1; $i <= $boardCount; $i++) {
            $schema = $schemas[array_rand($schemas)];
            $boards[] = Surfboard::query()->firstOrCreate(
                ['slug' => sprintf('tabla-superseed-%02d', $i)],
                [
                    'price_schema_id' => $schema->id,
                    'category' => $i % 2 === 0 ? Surfboard::CATEGORY_SOFT : Surfboard::CATEGORY_HARD,
                    'is_active' => true,
                    'name' => sprintf('Tabla Superseed %02d', $i),
                    'image_url' => json_encode(["surfboards/superseed-{$i}.jpg"]),
                    'image_alt' => sprintf('Tabla Superseed %02d', $i),
                    'description' => 'Tabla de prueba para flujo operativo.',
                    'altura' => 6.0 + ($i * 0.1),
                    'ancho' => 20.0 + ($i * 0.1),
                    'grosor' => 2.0 + ($i * 0.03),
                    'volumen' => 35 + $i,
                ]
            );
        }

        return [$schemas, $boards];
    }

    private function seedStoreFlow(array $students, array $products): void
    {
        foreach ($students as $index => $student) {
            $carrito = Carrito::query()->firstOrCreate(['user_id' => $student->id]);
            $carrito->productos()->detach();

            $picked = collect($products)->shuffle()->take(random_int(2, 4));
            foreach ($picked as $prod) {
                $carrito->productos()->attach($prod->id, ['cantidad' => random_int(1, 3)]);
            }

            if ($index >= 15) {
                continue;
            }

            $total = 0.0;
            $pedido = Pedido::query()->create([
                'user_id' => $student->id,
                'precio_total' => 0,
                'pagado' => $index % 2 === 0,
                'entregado' => $index % 3 === 0,
            ]);

            foreach ($carrito->productos()->withPivot('cantidad')->get() as $prod) {
                $cantidad = min((int) $prod->pivot->cantidad, max(1, (int) $prod->unidades));
                if ($cantidad <= 0) {
                    continue;
                }
                $precioBase = (float) $prod->precio;
                $descuento = (float) $prod->descuento;
                $precioPagado = round($precioBase - ($precioBase * ($descuento / 100)), 2);
                $subtotal = $precioPagado * $cantidad;
                $total += $subtotal;

                $pedido->productos()->attach($prod->id, [
                    'cantidad' => $cantidad,
                    'descuento_aplicado' => $descuento,
                    'precio_pagado' => $precioPagado,
                ]);

                $prod->decrement('unidades', $cantidad);
            }

            $pedido->update(['precio_total' => round($total, 2)]);
            $carrito->delete();
        }
    }

    private function seedAcademyFlow(array $students, array $staff, User $admin): array
    {
        $lessons = [];
        $levels = [Lesson::LEVEL_INICIACION, Lesson::LEVEL_INTERMEDIO, Lesson::LEVEL_AVANZADO];
        $modalities = [Lesson::MODALITY_GRUPAL, Lesson::MODALITY_PARTICULAR, Lesson::MODALITY_SEMANAL];
        $statuses = [
            LessonUser::STATUS_CONFIRMED,
            LessonUser::STATUS_PENDING,
            LessonUser::STATUS_ATTENDED,
            LessonUser::STATUS_CANCELLED_LATE_LOST,
        ];

        for ($i = 0; $i < 18; $i++) {
            $start = Carbon::now()->subDays(6)->addDays($i)->setTime(9 + ($i % 7), 0);
            $lesson = Lesson::query()->create([
                'title' => "Clase Operativa {$i}",
                'description' => 'Clase generada para super-seeding',
                'starts_at' => $start,
                'ends_at' => (clone $start)->addMinutes(90),
                'type' => Lesson::TYPE_SURF,
                'modality' => $modalities[$i % count($modalities)],
                'batch_id' => $i % 5 === 0 ? Str::uuid()->toString() : null,
                'level' => $levels[$i % count($levels)],
                'max_slots' => $i % 3 === 0 ? 6 : 8,
                'max_capacity' => $i % 3 === 0 ? 6 : 8,
                'price' => 35,
                'currency' => 'EUR',
                'location' => 'Playa Zurriola',
                'is_private' => $modalities[$i % count($modalities)] === Lesson::MODALITY_PARTICULAR,
                'is_surf_trip' => $i % 7 === 0,
                'is_optimal_waves' => $i % 4 === 0,
                'status' => Lesson::STATUS_SCHEDULED,
            ]);

            $monitor = $staff[$i % count($staff)];
            $fotografo = $staff[($i + 1) % count($staff)];
            StaffAssignment::query()->create(['lesson_id' => $lesson->id, 'user_id' => $monitor->id, 'role' => 'monitor']);
            StaffAssignment::query()->create(['lesson_id' => $lesson->id, 'user_id' => $fotografo->id, 'role' => 'fotografo']);

            $seats = 0;
            foreach (collect($students)->shuffle()->take(random_int(4, 7)) as $student) {
                $status = $statuses[array_rand($statuses)];
                $partySize = 1;
                if ($seats + $partySize > (int) $lesson->max_slots) {
                    break;
                }

                $enrollment = LessonUser::query()->create([
                    'lesson_id' => $lesson->id,
                    'user_id' => $student->id,
                    'party_size' => $partySize,
                    'quantity' => $partySize,
                    'credits_locked' => in_array($status, [LessonUser::STATUS_ATTENDED, LessonUser::STATUS_CANCELLED_LATE_LOST], true) ? 1 : 0,
                    'status' => $status,
                    'payment_status' => $status === LessonUser::STATUS_PENDING ? LessonUser::PAYMENT_PENDING : LessonUser::PAYMENT_CONFIRMED,
                    'confirmed_at' => $status === LessonUser::STATUS_PENDING ? null : Carbon::now()->subDays(random_int(1, 5)),
                    'expires_at' => Carbon::now()->addHours(6),
                ]);

                if ($status === LessonUser::STATUS_ATTENDED) {
                    AttendanceNote::query()->create([
                        'user_id' => $student->id,
                        'reservation_type' => LessonUser::class,
                        'reservation_id' => $enrollment->id,
                        'body' => 'Asistencia validada en seed operativo.',
                        'is_visible_to_student' => true,
                        'admin_id' => $admin->id,
                    ]);
                }

                if ($status === LessonUser::STATUS_CANCELLED_LATE_LOST) {
                    CreditTransaction::query()->create([
                        'user_id' => $student->id,
                        'amount' => -1,
                        'type' => CreditTransaction::TYPE_LESSON_CHARGE,
                        'lesson_id' => $lesson->id,
                        'lesson_user_id' => $enrollment->id,
                        'description' => 'Cancelación tardía con pérdida de crédito (seed).',
                    ]);
                }

                $seats += $partySize;
            }

            $lessons[] = $lesson;
        }

        return $lessons;
    }

    private function seedBonoFlow(array $students, array $packs, array $lessons): void
    {
        foreach (collect($students)->take(16)->values() as $idx => $student) {
            $pack = $packs[$idx % count($packs)];
            $isPending = $idx % 4 === 0;

            $bono = UserBono::query()->create([
                'user_id' => $student->id,
                'pack_id' => $pack->id,
                'clases_restantes' => (int) $pack->num_clases,
                'status' => $isPending ? UserBono::STATUS_PENDING : UserBono::STATUS_CONFIRMED,
                'payment_proof_path' => "comprobantes_bonos/superseed/{$student->id}.pdf",
                'admin_notes' => $isPending ? 'Pendiente de validación superseed' : 'Confirmado automáticamente por superseed',
            ]);

            if ($isPending) {
                continue;
            }

            CreditTransaction::query()->create([
                'user_id' => $student->id,
                'amount' => (int) $pack->num_clases,
                'type' => CreditTransaction::TYPE_PURCHASE,
                'description' => "Compra de {$pack->nombre} (seed).",
            ]);

            $consumed = random_int(2, min(6, (int) $pack->num_clases));
            $remaining = (int) $pack->num_clases;
            foreach (collect($lessons)->shuffle()->take($consumed) as $lesson) {
                $enrollment = LessonUser::query()->firstOrCreate(
                    ['lesson_id' => $lesson->id, 'user_id' => $student->id],
                    [
                        'party_size' => 1,
                        'quantity' => 1,
                        'credits_locked' => 1,
                        'status' => LessonUser::STATUS_ATTENDED,
                        'payment_status' => LessonUser::PAYMENT_CONFIRMED,
                        'confirmed_at' => Carbon::now()->subDays(1),
                    ]
                );

                $remaining = max(0, $remaining - 1);
                BonoConsumption::query()->create([
                    'user_bono_id' => $bono->id,
                    'user_id' => $student->id,
                    'lesson_id' => $lesson->id,
                    'remaining_after' => $remaining,
                    'consumed_at' => Carbon::now()->subDays(random_int(0, 8)),
                ]);

                CreditTransaction::query()->create([
                    'user_id' => $student->id,
                    'amount' => -1,
                    'type' => CreditTransaction::TYPE_LESSON_CHARGE,
                    'lesson_id' => $lesson->id,
                    'lesson_user_id' => $enrollment->id,
                    'description' => 'Descuento por asistencia usando bono (seed).',
                ]);
            }

            $bono->update(['clases_restantes' => $remaining]);
        }
    }

    private function seedLockerFlow(array $students, array $plans): void
    {
        foreach (collect($students)->take(18)->values() as $idx => $student) {
            $plan = $plans[$idx % count($plans)];
            $forceExpired = $idx < 3;
            $start = $forceExpired
                ? Carbon::now()->subDays(90 + ($idx * 5))
                : Carbon::now()->subDays(25)->addDays($idx);
            $end = $forceExpired
                ? Carbon::now()->subDays(7 + $idx)
                : (clone $start)->addDays((int) $plan->duracion_dias)->subDay();
            $status = $forceExpired
                ? PagoCuota::STATUS_CONFIRMED
                : ($idx % 5 === 0 ? PagoCuota::STATUS_PENDING : ($idx % 4 === 0 ? PagoCuota::STATUS_PENDING : PagoCuota::STATUS_CONFIRMED));
            $pendingWithProof = $status === PagoCuota::STATUS_PENDING && ($idx % 4 === 0);

            PagoCuota::query()->create([
                'user_id' => $student->id,
                'id_plan_pagado' => $plan->id,
                'monto_pagado' => (float) $plan->precio_total,
                'referencia_pago_externa' => 'SEED-TAQ-'.strtoupper(Str::random(8)),
                'status' => $status,
                'payment_proof_path' => ($status === PagoCuota::STATUS_CONFIRMED || $pendingWithProof) ? "taquilla-proofs/seed/{$student->id}.pdf" : null,
                'proof_uploaded_at' => ($status === PagoCuota::STATUS_CONFIRMED || $pendingWithProof) ? Carbon::now()->subDays(random_int(0, 3)) : null,
                'payment_method' => ($status === PagoCuota::STATUS_CONFIRMED || $pendingWithProof) ? 'bizum' : null,
                'periodo_inicio' => $start,
                'periodo_fin' => $end,
                'fecha_pago' => Carbon::now()->subDays(random_int(0, 10)),
            ]);

            if ($status === PagoCuota::STATUS_CONFIRMED) {
                $student->update([
                    'numeroTaquilla' => 300 + $idx,
                    'fecha_vencimiento_cuota' => $end,
                    'id_plan_vigente' => $plan->id,
                ]);
            }
        }
    }

    private function seedRentalFlow(array $students, array $boards, array $schemas): void
    {
        $service = app(BookingService::class);

        foreach (collect($students)->take(16)->values() as $idx => $student) {
            $board = $boards[$idx % count($boards)];
            $schema = $schemas[$idx % count($schemas)];
            $start = Carbon::now()->addDays($idx % 6)->setTime(8 + ($idx % 5), 0);
            $end = (clone $start)->addHours([4, 12, 24, 48][$idx % 4]);
            $status = $idx % 3 === 0 ? Booking::STATUS_PENDING : Booking::STATUS_CONFIRMED;

            if (! $service->isAvailable($board->id, $start, $end)) {
                continue;
            }

            $total = $service->calculateBestPrice($schema, $start, $end);
            $deposit = $service->calculateDeposit($total, 30);

            Booking::query()->create([
                'surfboard_id' => $board->id,
                'user_id' => $student->id,
                'client_name' => trim($student->nombre.' '.$student->apellido),
                'client_email' => $student->email,
                'client_phone' => $student->telefono,
                'start_date' => $start,
                'end_date' => $end,
                'expires_at' => Carbon::now()->addDays(2),
                'status' => $status,
                'payment_status' => $status === Booking::STATUS_PENDING ? Booking::PAYMENT_PENDING : Booking::PAYMENT_CONFIRMED,
                'payment_proof_path' => $status === Booking::STATUS_PENDING ? null : "bookings/seed/{$student->id}.pdf",
                'proof_uploaded_at' => $status === Booking::STATUS_PENDING ? null : Carbon::now()->subDay(),
                'payment_method' => $status === Booking::STATUS_PENDING ? null : 'bizum',
                'total_price' => $total,
                'deposit_amount' => $deposit,
            ]);
        }
    }
}
