<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Rastro persistente de las altas y bajas de taquilla.
 *
 * Hasta ahora la baja solo existía como aviso (`taquilla_baja_solicitada_at`) y al
 * confirmarla se borraba: no quedaba forma de saber si un socio se fue o si
 * simplemente dejó de pagar. Esa diferencia es de caja: el que avisa no debe los
 * meses que estuvo fuera; el que no avisa sí. Sin backfill posible (el dato no
 * existía), así que las bajas anteriores a esta migración quedan en null.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('taquilla_baja_efectiva_at')->nullable()->after('taquilla_baja_solicitada_at');
            $table->timestamp('taquilla_alta_at')->nullable()->after('taquilla_baja_efectiva_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['taquilla_baja_efectiva_at', 'taquilla_alta_at']);
        });
    }
};
