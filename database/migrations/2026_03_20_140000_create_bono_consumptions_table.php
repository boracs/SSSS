<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bono_consumptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_bono_id')->constrained('user_bonos')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('lesson_id')->constrained('lessons')->cascadeOnDelete();
            $table->unsignedInteger('remaining_after');
            $table->timestamp('consumed_at');
            $table->timestamps();

            $table->index(['user_id', 'consumed_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bono_consumptions');
    }
};

