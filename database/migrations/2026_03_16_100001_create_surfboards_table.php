<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('surfboards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('price_schema_id')->constrained('price_schemas')->cascadeOnDelete();
            $table->string('category', 10); // 'hard' | 'soft'
            $table->boolean('is_active')->default(true);
            $table->string('name')->nullable(); // identificador corto (ej. "Tabla 1")
            $table->text('image_url')->nullable(); // JSON array de URLs o path(s)
            $table->text('description')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('surfboards');
    }
};
