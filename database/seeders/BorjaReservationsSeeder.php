<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\PaymentStatus;
use App\Models\Booking;
use App\Models\Lesson;
use App\Models\LessonUser;
use App\Models\StaffAssignment;
use App\Models\Surfboard;
use App\Models\User;
use App\Services\BookingService;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Demo: Borja Borja (userno@gmail.com) — clases y alquileres visibles en /mis-reservas.
 */
class BorjaReservationsSeeder extends Seeder
{
    private const DEMO_PASSWORD = '12121212';

    public function run(): void
    {
        $monitor = User::query()
            ->where('role', 'admin')
            ->orWhere('email', 'like', 'monitor%')
            ->orderBy('id')
            ->first();

        if (! $monitor) {
            $this->command?->warn('BorjaReservationsSeeder: sin monitor/admin.');

            return;
        }

        $borja = User::query()->updateOrCreate(
            ['email' => 'userno@gmail.com'],
            [
                'nombre' => 'Borja',
                'apellido' => 'Borja',
                'telefono' => '600555777',
                'password' => Hash::make(self::DEMO_PASSWORD),
                'role' => 'user',
                'is_vip' => false,
                'email_verified_at' => now(),
            ]
        );

        DB::transaction(function () use ($borja, $monitor): void {
            $this->seedClassReservations($borja, $monitor);
            $this->seedRentalReservations($borja);
        });

        $this->command?->info('BorjaReservationsSeeder OK — userno@gmail.com / '.self::DEMO_PASSWORD);
    }

    private function seedClassReservations(User $borja, User $monitor): void
    {
        $defs = [
            [
                'title' => 'Clase Grupal — Borja',
                'days' => 6,
                'hour' => 10,
                'modality' => Lesson::MODALITY_GRUPAL,
                'level' => Lesson::LEVEL_INTERMEDIO,
                'confirmed' => true,
            ],
            [
                'title' => 'Clase Grupal — Borja (pendiente pago)',
                'days' => 14,
                'hour' => 11,
                'modality' => Lesson::MODALITY_GRUPAL,
                'level' => Lesson::LEVEL_INICIACION,
                'confirmed' => false,
            ],
        ];

        foreach ($defs as $def) {
            $start = Carbon::now()->addDays((int) $def['days'])->setTime((int) $def['hour'], 0);

            $lesson = Lesson::query()->firstOrCreate(
                ['title' => $def['title']],
                [
                    'description' => 'Clase demo para Borja Borja.',
                    'starts_at' => $start,
                    'ends_at' => (clone $start)->addMinutes(90),
                    'type' => Lesson::TYPE_SURF,
                    'modality' => $def['modality'],
                    'level' => $def['level'],
                    'max_slots' => 8,
                    'max_capacity' => 8,
                    'price' => 35,
                    'currency' => 'EUR',
                    'location' => 'Playa Zurriola',
                    'is_private' => false,
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

            LessonUser::query()->updateOrCreate(
                ['lesson_id' => $lesson->id, 'user_id' => $borja->id],
                [
                    'party_size' => 1,
                    'quantity' => 1,
                    'status' => $def['confirmed'] ? LessonUser::STATUS_CONFIRMED : LessonUser::STATUS_PENDING,
                    'payment_status' => $def['confirmed']
                        ? PaymentStatus::Confirmed->value
                        : PaymentStatus::Pending->value,
                    'payment_method' => $def['confirmed'] ? 'transferencia' : 'bizum',
                    'confirmed_at' => $def['confirmed'] ? now()->subDay() : null,
                    'expires_at' => $def['confirmed'] ? null : now()->addDays(2),
                ]
            );
        }
    }

    private function seedRentalReservations(User $borja): void
    {
        $board = Surfboard::query()->where('is_active', true)->with('priceSchema')->first();
        if ($board === null || $board->priceSchema === null) {
            $this->command?->warn('BorjaReservationsSeeder: sin tabla de alquiler activa.');

            return;
        }

        $service = app(BookingService::class);

        $slots = [
            ['days' => 4, 'confirmed' => true],
            ['days' => 10, 'confirmed' => false],
        ];

        foreach ($slots as $idx => $slot) {
            $start = Carbon::now()->addDays($slot['days'])->setTime(9, 0);
            $end = (clone $start)->addHours(24);

            if (! $service->isAvailable((int) $board->id, $start, $end)) {
                continue;
            }

            $pricing = $service->resolvePricing($board->priceSchema, $start, $end);
            $confirmed = (bool) $slot['confirmed'];

            Booking::query()->updateOrCreate(
                [
                    'user_id' => $borja->id,
                    'surfboard_id' => $board->id,
                    'start_date' => $start,
                ],
                [
                    'client_name' => trim($borja->nombre.' '.$borja->apellido),
                    'client_email' => $borja->email,
                    'client_phone' => $borja->telefono,
                    'end_date' => $end,
                    'expires_at' => now()->addDays(7),
                    'status' => $confirmed ? Booking::STATUS_CONFIRMED : Booking::STATUS_PENDING,
                    'payment_status' => $confirmed ? PaymentStatus::Confirmed->value : PaymentStatus::Pending->value,
                    'payment_proof_path' => $confirmed ? 'payment-proofs/rentals/borja-demo.jpg' : null,
                    'proof_uploaded_at' => $confirmed ? now()->subHours(6) : null,
                    'payment_method' => $confirmed ? 'bizum' : null,
                    'total_price' => $pricing['total_price'],
                    'deposit_amount' => $pricing['deposit_amount'],
                ]
            );
        }
    }
}
