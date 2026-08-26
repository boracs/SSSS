<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Deuda técnica P3: dinero de tienda (pedidos + pivot) a céntimos enteros.
 * Mismo patrón que 2026_06_23_140000_convert_taquilla_money_to_cents.php:
 * añadir _cents, backfill desde el decimal, y dropear la columna vieja.
 * `descuento_aplicado` NO se migra: es un porcentaje (0-100), no dinero.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pedidos', function (Blueprint $table): void {
            $table->unsignedBigInteger('precio_total_cents')
                ->nullable()
                ->after('fecha_entrega')
                ->comment('Total del pedido en centimos EUR (entero)');
        });

        Schema::table('pedido_producto', function (Blueprint $table): void {
            $table->unsignedBigInteger('precio_pagado_cents')
                ->nullable()
                ->after('descuento_aplicado')
                ->comment('Precio pagado por unidad en centimos EUR (entero)');
        });

        DB::table('pedidos')->orderBy('id')->each(function (object $row): void {
            DB::table('pedidos')->where('id', $row->id)->update([
                'precio_total_cents' => (int) round(((float) $row->precio_total) * 100),
            ]);
        });

        DB::table('pedido_producto')->orderBy('id_pedido')->orderBy('id_producto')->each(function (object $row): void {
            DB::table('pedido_producto')
                ->where('id_pedido', $row->id_pedido)
                ->where('id_producto', $row->id_producto)
                ->update([
                    'precio_pagado_cents' => (int) round(((float) $row->precio_pagado) * 100),
                ]);
        });

        Schema::table('pedidos', function (Blueprint $table): void {
            $table->dropColumn('precio_total');
        });

        Schema::table('pedido_producto', function (Blueprint $table): void {
            $table->dropColumn('precio_pagado');
        });
    }

    public function down(): void
    {
        Schema::table('pedidos', function (Blueprint $table): void {
            $table->decimal('precio_total', 10, 2)->nullable()->after('fecha_entrega');
        });

        Schema::table('pedido_producto', function (Blueprint $table): void {
            $table->decimal('precio_pagado', 10, 2)->nullable()->after('descuento_aplicado');
        });

        DB::table('pedidos')->orderBy('id')->each(function (object $row): void {
            DB::table('pedidos')->where('id', $row->id)->update([
                'precio_total' => round(((int) $row->precio_total_cents) / 100, 2),
            ]);
        });

        DB::table('pedido_producto')->orderBy('id_pedido')->orderBy('id_producto')->each(function (object $row): void {
            DB::table('pedido_producto')
                ->where('id_pedido', $row->id_pedido)
                ->where('id_producto', $row->id_producto)
                ->update([
                    'precio_pagado' => round(((int) $row->precio_pagado_cents) / 100, 2),
                ]);
        });

        Schema::table('pedidos', function (Blueprint $table): void {
            $table->dropColumn('precio_total_cents');
        });

        Schema::table('pedido_producto', function (Blueprint $table): void {
            $table->dropColumn('precio_pagado_cents');
        });
    }
};
