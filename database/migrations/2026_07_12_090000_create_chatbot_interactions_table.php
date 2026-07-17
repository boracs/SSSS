<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('chatbot_interactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            // Correlación de sesión anónima (crypto.randomUUID() persistido en localStorage).
            $table->string('session_token', 64)->nullable();
            $table->string('status', 20)->default('active');
            // Ventana acotada de turnos {role, text}; el Service limita su tamaño antes de persistir.
            $table->json('history')->nullable();
            $table->string('flag_reason', 60)->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();

            $table->index('user_id');
            $table->index('session_token');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chatbot_interactions');
    }
};
