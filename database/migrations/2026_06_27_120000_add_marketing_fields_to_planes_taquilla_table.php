<?php

use App\Models\PlanTaquilla;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('planes_taquilla', function (Blueprint $table) {
            $table->text('descripcion')->nullable()->after('precio_total_cents');
            $table->unsignedTinyInteger('porcentaje_descuento')->default(50)->after('descripcion');
            $table->boolean('es_vip')->default(false)->after('porcentaje_descuento');
        });

        PlanTaquilla::query()->each(function (PlanTaquilla $plan) {
            $esVip = stripos($plan->nombre, 'vip') !== false;
            $meses = max(1, (int) round($plan->duracion_dias / 30));
            $base = $esVip
                ? 'Membresía VIP con máximas ventajas en tienda y prioridad en servicios del club.'
                : 'Acceso completo al club: taquilla, material, instalaciones y micro-servicios.';
            $periodo = $meses === 1 ? 'probar el club un mes' : "compromiso de {$meses} meses";

            $plan->update([
                'es_vip' => $esVip,
                'porcentaje_descuento' => $esVip ? 50 : 45,
                'descripcion' => trim("{$base} Ideal para {$periodo}."),
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('planes_taquilla', function (Blueprint $table) {
            $table->dropColumn(['descripcion', 'porcentaje_descuento', 'es_vip']);
        });
    }
};
