<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Categorías de alquiler: soft | hard_basic | hard_pro.
 * Las tablas `hard` existentes pasan a `hard_basic`.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('surfboards', function (Blueprint $table) {
            $table->string('category', 20)->change();
        });

        DB::table('surfboards')->where('category', 'hard')->update(['category' => 'hard_basic']);
    }

    public function down(): void
    {
        DB::table('surfboards')->whereIn('category', ['hard_basic', 'hard_pro'])->update(['category' => 'hard']);

        Schema::table('surfboards', function (Blueprint $table) {
            $table->string('category', 10)->change();
        });
    }
};
