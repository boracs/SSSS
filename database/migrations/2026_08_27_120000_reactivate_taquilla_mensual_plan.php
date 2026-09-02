<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('planes_taquilla')
            ->where('duracion_dias', 30)
            ->update(['activo' => true, 'updated_at' => now()]);
    }

    public function down(): void
    {
        DB::table('planes_taquilla')
            ->where('duracion_dias', 30)
            ->update(['activo' => false, 'updated_at' => now()]);
    }
};
