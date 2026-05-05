<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pagos_cuotas', function (Blueprint $table) {
            if (! Schema::hasColumn('pagos_cuotas', 'is_checked')) {
                $table->boolean('is_checked')->default(false)->after('status');
            }
        });
    }

    public function down(): void
    {
        Schema::table('pagos_cuotas', function (Blueprint $table) {
            if (Schema::hasColumn('pagos_cuotas', 'is_checked')) {
                $table->dropColumn('is_checked');
            }
        });
    }
};
