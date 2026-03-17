<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lesson_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lesson_id')->constrained('lessons')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedTinyInteger('credits_locked')->default(1); // 1 or 2 (solo student)
            $table->string('status', 20)->default('enrolled'); // enrolled, attended, cancelled, refunded
            $table->timestamp('cancelled_at')->nullable();
            $table->boolean('surf_trip_confirmed')->nullable(); // null = pending, true = confirmed, false = refund requested
            $table->timestamps();

            $table->unique(['lesson_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lesson_user');
    }
};
