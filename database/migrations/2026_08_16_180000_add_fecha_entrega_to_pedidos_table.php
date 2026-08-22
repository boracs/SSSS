<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('pedidos', 'fecha_entrega')) {
            return;
        }

        Schema::table('pedidos', function (Blueprint $table) {
            $table->date('fecha_entrega')->nullable()->after('entregado');
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('pedidos', 'fecha_entrega')) {
            return;
        }

        Schema::table('pedidos', function (Blueprint $table) {
            $table->dropColumn('fecha_entrega');
        });
    }
};
