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
            $table->timestamp('expires_at')->nullable()->after('fecha_pago');
            $table->index(['status', 'expires_at']);
        });
    }

    public function down(): void
    {
        Schema::table('pagos_cuotas', function (Blueprint $table) {
            $table->dropIndex(['status', 'expires_at']);
            $table->dropColumn('expires_at');
        });
    }
};
