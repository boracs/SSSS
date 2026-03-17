<?php

use App\Models\User;
use App\Models\Producto;
use App\Models\Pedido;
use App\Models\Carrito;
use App\Models\Imagen;
use App\Models\PlanTaquilla;
use App\Models\PagoCuota;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Faker\Factory as Faker;
use Database\Seeders\PriceSchemaSeeder; 

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $faker = Faker::create('es_ES');

        // ===============================
        // 1️⃣ Crear usuarios
        // ===============================
        $users = User::factory(10)->create();

        // ===============================
        // 2️⃣ Crear productos e imágenes
        // ===============================
        $productos = Producto::factory(40)->create();
        foreach ($productos as $producto) {
            Imagen::factory(rand(1, 3))->create(['producto_id' => $producto->id]);
            $producto->imagenes()->inRandomOrder()->first()->update(['es_principal' => true]);
        }

        // ===============================
        // 3️⃣ Crear planes de taquilla
        // ===============================
        $planes = [];
        $tiposPlanes = [
            ['nombre' => 'Mensual', 'duracion_dias' => 30, 'precio_total' => 60],
            ['nombre' => 'Trimestral', 'duracion_dias' => 90, 'precio_total' => 165],
            ['nombre' => 'Semestral', 'duracion_dias' => 180, 'precio_total' => 300],
            ['nombre' => 'Anual', 'duracion_dias' => 365, 'precio_total' => 480],
        ];

        foreach ($tiposPlanes as $tipo) {
            $planes[$tipo['nombre']] = PlanTaquilla::create([
                'nombre' => "{$tipo['nombre']} ({$tipo['duracion_dias']} días)",
                'duracion_dias' => $tipo['duracion_dias'],
                'precio_total' => $tipo['precio_total'],
                'activo' => true,
            ]);
        }

        $planMinimo = $planes['Mensual'];

        // ===============================
        // 4️⃣ Crear historial de pagos y asignar planes a usuarios
        // ===============================
        foreach ($users as $index => $user) {
            $user->numeroTaquilla = $index + 1;
            $numPagos = rand(1, 3);
            $fechaBase = Carbon::now()->subMonths(rand(1, 18))->startOfDay();

            for ($j = 0; $j < $numPagos; $j++) {
                $plan = $j === 0 ? $planMinimo : $planes[array_rand($planes)];
                $inicio = $fechaBase;
                $fin = $inicio->copy()->addDays($plan->duracion_dias);
                $referenciaPago = 'REF-' . strtoupper(uniqid());
                $fechaPagoSimulada = $inicio->copy()->addDays(rand(0, 3))->startOfDay();

                PagoCuota::create([
                    'user_id' => $user->id,
                    'id_plan_pagado' => $plan->id,
                    'monto_pagado' => $plan->precio_total,
                    'referencia_pago_externa' => $referenciaPago,
                    'fecha_pago' => $fechaPagoSimulada,
                    'periodo_inicio' => $inicio,
                    'periodo_fin' => $fin,
                    'created_at' => $fechaPagoSimulada,
                ]);

                $fechaBase = $fin->copy()->addDays(rand(0, 5))->startOfDay();
            }

            // Forzar que un 30% de los usuarios tengan plan vencido
            if ($index % 3 === 0) {
                $ultimoPago = PagoCuota::where('user_id', $user->id)->latest('periodo_fin')->first();
                if ($ultimoPago) {
                    $ultimoPago->periodo_fin = Carbon::now()->subDays(rand(10, 30))->endOfDay();
                    $ultimoPago->save();
                }
            }

            // Asignar plan vigente y fecha de vencimiento
            $ultimoPagoDefinitivo = PagoCuota::where('user_id', $user->id)->latest('periodo_fin')->first();
            if ($ultimoPagoDefinitivo) {
                $user->id_plan_vigente = $ultimoPagoDefinitivo->id_plan_pagado;
                $user->fecha_vencimiento_cuota = $ultimoPagoDefinitivo->periodo_fin;
            }

            $user->save();
        }

        // ===============================
        // 5️⃣ Esquemas de precio para tablas de surf
        // ===============================
        $this->call(PriceSchemaSeeder::class);

        // ===============================
        // 6️⃣ Crear admin fijo
        // ===============================
        User::create([
            'nombre' => 'admin',
            'apellido' => 'principal',
            'email' => 'admin@example.com',
            'password' => Hash::make('password'),
            'role' => 'admin',
            'numeroTaquilla' => null,
            'fecha_vencimiento_cuota' => null,
            'id_plan_vigente' => null,
        ]);

        // ===============================
        // 7️⃣ Crear pedidos y carritos
        // ===============================
        foreach ($users as $user) {
            $pedido = Pedido::factory()->create(['id_usuario' => $user->id]);
            $selectedProducts = $productos->random(rand(1, 3));
            foreach ($selectedProducts as $producto) {
                $pedido->productos()->attach($producto->id, [
                    'cantidad' => rand(1, 3),
                    'descuento_aplicado' => rand(0, $producto->descuento ?? 0),
                    'precio_pagado' => $producto->precio,
                ]);
            }

            $carrito = Carrito::create(['id_usuario' => $user->id]);
            $selectedProducts = $productos->random(rand(1, 5));
            foreach ($selectedProducts as $producto) {
                $carrito->productos()->attach($producto->id, ['cantidad' => rand(1, 5)]);
            }
        }
    }
}
