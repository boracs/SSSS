<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('planes_taquilla', function (Blueprint $table): void {
            $table->unsignedBigInteger('precio_total_cents')
                ->nullable()
                ->after('duracion_dias')
                ->comment('Importe del plan en centimos EUR (entero)');
        });

        Schema::table('pagos_cuotas', function (Blueprint $table): void {
            $table->unsignedBigInteger('monto_pagado_cents')
                ->nullable()
                ->after('id_plan_pagado')
                ->comment('Importe abonado en centimos EUR (entero)');
        });

        DB::table('planes_taquilla')->orderBy('id')->each(function (object $row): void {
            DB::table('planes_taquilla')->where('id', $row->id)->update([
                'precio_total_cents' => (int) round(((float) $row->precio_total) * 100),
            ]);
        });

        DB::table('pagos_cuotas')->orderBy('id')->each(function (object $row): void {
            DB::table('pagos_cuotas')->where('id', $row->id)->update([
                'monto_pagado_cents' => (int) round(((float) $row->monto_pagado) * 100),
            ]);
        });

        Schema::table('planes_taquilla', function (Blueprint $table): void {
            $table->dropColumn('precio_total');
        });

        Schema::table('pagos_cuotas', function (Blueprint $table): void {
            $table->dropColumn('monto_pagado');
        });
    }

    public function down(): void
    {
        Schema::table('planes_taquilla', function (Blueprint $table): void {
            $table->decimal('precio_total', 10, 2)->nullable()->after('duracion_dias');
        });

        Schema::table('pagos_cuotas', function (Blueprint $table): void {
            $table->decimal('monto_pagado', 10, 2)->nullable()->after('id_plan_pagado');
        });

        DB::table('planes_taquilla')->orderBy('id')->each(function (object $row): void {
            DB::table('planes_taquilla')->where('id', $row->id)->update([
                'precio_total' => round(((int) $row->precio_total_cents) / 100, 2),
            ]);
        });

        DB::table('pagos_cuotas')->orderBy('id')->each(function (object $row): void {
            DB::table('pagos_cuotas')->where('id', $row->id)->update([
                'monto_pagado' => round(((int) $row->monto_pagado_cents) / 100, 2),
            ]);
        });

        Schema::table('planes_taquilla', function (Blueprint $table): void {
            $table->dropColumn('precio_total_cents');
        });

        Schema::table('pagos_cuotas', function (Blueprint $table): void {
            $table->dropColumn('monto_pagado_cents');
        });
    }
};
