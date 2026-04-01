<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_bonos', function (Blueprint $table) {
            $table->integer('debt_compensated_uc')->default(0)->after('clases_restantes');
        });
    }

    public function down(): void
    {
        Schema::table('user_bonos', function (Blueprint $table) {
            $table->dropColumn('debt_compensated_uc');
        });
    }
};

