<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Pedido;
use App\Models\Producto;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

/**
 * Genera pedidos de demo para probar paginación del gestor admin.
 */
final class ExtraPedidosSeeder extends Seeder
{
    public function run(): void
    {
        $users = User::query()
            ->where('role', 'user')
            ->orderBy('id')
            ->get();

        if ($users->isEmpty()) {
            $this->command?->warn('ExtraPedidosSeeder: no hay usuarios cliente.');

            return;
        }

        $products = Producto::query()->where('eliminado', false)->orderBy('id')->get();
        if ($products->count() < 3) {
            $this->command?->warn('ExtraPedidosSeeder: pocos productos en catálogo.');

            return;
        }

        $target = 20;
        $existing = Pedido::query()->count();
        $toCreate = max(0, $target - $existing);

        if ($toCreate === 0) {
            $this->command?->info("ExtraPedidosSeeder: ya hay {$existing} pedidos (objetivo {$target}).");

            return;
        }

        $created = 0;

        for ($i = 0; $i < $toCreate; $i++) {
            $user = $users[$i % $users->count()];
            $daysAgo = ($i % 45) + 1;
            $pagado = $i % 5 !== 2;
            $entregado = $pagado && ($i % 3 === 0);

            $picked = $products->random(min(3, max(1, ($i % 3) + 1)));
            $total = 0.0;

            $pedido = Pedido::query()->create([
                'user_id' => $user->id,
                'precio_total' => 0,
                'pagado' => $pagado,
                'entregado' => $entregado,
                'payment_method' => $pagado ? ($i % 2 === 0 ? 'bizum' : 'transferencia') : null,
                'created_at' => Carbon::now()->subDays($daysAgo)->subHours($i % 12),
                'updated_at' => Carbon::now()->subDays(max(0, $daysAgo - 1)),
            ]);

            foreach ($picked as $prod) {
                $cantidad = 1 + ($i % 2);
                $descuento = (float) ($prod->descuento ?? 0);
                $precioPagado = round((float) $prod->precio * (1 - $descuento / 100), 2);
                $total += $precioPagado * $cantidad;

                $pedido->productos()->attach($prod->id, [
                    'cantidad' => $cantidad,
                    'descuento_aplicado' => $descuento,
                    'precio_pagado' => $precioPagado,
                ]);
            }

            $pedido->update(['precio_total' => round($total, 2)]);
            $created++;
        }

        $this->command?->info(sprintf(
            'ExtraPedidosSeeder: %d pedido(s) creado(s). Total en BD: %d.',
            $created,
            Pedido::query()->count()
        ));
    }
}
