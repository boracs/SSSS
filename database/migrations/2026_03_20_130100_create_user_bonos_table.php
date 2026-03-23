<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_bonos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('pack_id')->constrained('pack_bonos')->cascadeOnDelete();
            $table->unsignedInteger('clases_restantes');
            $table->enum('status', ['pending', 'confirmed', 'rejected'])->default('pending');
            $table->string('payment_proof_path')->nullable();
            $table->text('admin_notes')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_bonos');
    }
};

