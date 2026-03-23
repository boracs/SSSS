<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'is_vip')) {
                $table->boolean('is_vip')->default(false)->after('role');
            }
            if (Schema::hasColumn('users', 'credits_balance')) {
                $table->dropColumn('credits_balance');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'credits_balance')) {
                $table->unsignedInteger('credits_balance')->default(0)->after('numeroTaquilla');
            }
            if (Schema::hasColumn('users', 'is_vip')) {
                $table->dropColumn('is_vip');
            }
        });
    }
};

