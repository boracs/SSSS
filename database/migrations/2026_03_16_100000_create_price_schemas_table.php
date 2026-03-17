<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('price_schemas', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->decimal('price_1h', 8, 2)->default(0);
            $table->decimal('price_2h', 8, 2)->default(0);
            $table->decimal('price_4h', 8, 2)->default(0);
            $table->decimal('price_12h', 8, 2)->default(0);
            $table->decimal('price_24h', 8, 2)->default(0);
            $table->decimal('price_48h', 8, 2)->default(0);
            $table->decimal('price_72h', 8, 2)->default(0);
            $table->decimal('price_week', 8, 2)->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('price_schemas');
    }
};
