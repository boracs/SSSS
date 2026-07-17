<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pagos_cuotas', function (Blueprint $table) {
            $table->string('referencia_pago_externa', 255)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('pagos_cuotas', function (Blueprint $table) {
            $table->string('referencia_pago_externa', 50)->nullable()->change();
        });
    }
};
