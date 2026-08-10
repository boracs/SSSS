<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tarifa editable de clases particulares: precio total por número de personas
 * a la duración base (config academy.private_lesson_base_minutes). Otras
 * duraciones se prorratean sobre este precio.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('private_lesson_tariffs', function (Blueprint $table) {
            $table->id();
            $table->unsignedTinyInteger('people')->unique();
            $table->unsignedInteger('price_cents');
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('private_lesson_tariffs');
    }
};
