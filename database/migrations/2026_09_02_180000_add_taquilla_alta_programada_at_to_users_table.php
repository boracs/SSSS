<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Alta de taquilla a fecha futura: el número se reserva ya; la alta
 * efectiva y el periodo de cuota arrancan el día programado.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->date('taquilla_alta_programada_at')->nullable()->after('taquilla_alta_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('taquilla_alta_programada_at');
        });
    }
};
