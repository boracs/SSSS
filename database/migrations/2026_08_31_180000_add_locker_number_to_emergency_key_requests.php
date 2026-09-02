<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('emergency_key_requests', function (Blueprint $table) {
            $table->unsignedInteger('locker_number')->nullable()->after('user_id');
        });
    }

    public function down(): void
    {
        Schema::table('emergency_key_requests', function (Blueprint $table) {
            $table->dropColumn('locker_number');
        });
    }
};
