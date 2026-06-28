<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('emergency_lock_settings', function (Blueprint $table) {
            $table->id();
            $table->char('current_code', 4);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        DB::table('emergency_lock_settings')->insert([
            'current_code' => '0000',
            'is_active'    => true,
            'created_at'   => now(),
            'updated_at'   => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('emergency_lock_settings');
    }
};
