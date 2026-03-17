<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lessons', function (Blueprint $table) {
            $table->id();
            $table->string('title', 100)->nullable();
            $table->dateTime('starts_at');
            $table->dateTime('ends_at');
            $table->enum('level', ['iniciacion', 'pro'])->default('iniciacion');
            $table->unsignedTinyInteger('max_slots')->default(6);
            $table->string('location', 150)->default('La Concha / Zurriola');
            $table->boolean('is_surf_trip')->default(false);
            $table->boolean('is_optimal_waves')->default(false);
            $table->string('status', 20)->default('scheduled'); // scheduled, completed, cancelled
            $table->string('cancellation_reason', 50)->nullable(); // mal_mar, student, other
            $table->timestamp('surf_trip_triggered_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lessons');
    }
};
