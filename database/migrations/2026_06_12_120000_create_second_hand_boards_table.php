<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('second_hand_boards', function (Blueprint $table) {
            $table->id();
            $table->string('name', 120);
            $table->string('brand', 80)->nullable();
            $table->text('description')->nullable();
            $table->decimal('height', 5, 2);
            $table->decimal('width', 5, 2);
            $table->decimal('thickness', 4, 2);
            $table->decimal('volume', 6, 2);
            $table->unsignedInteger('purchase_price');
            $table->unsignedInteger('sale_price');
            $table->unsignedSmallInteger('discount_pct')->default(0);
            $table->string('status', 20)->default('available')->index();
            $table->json('images')->nullable();
            $table->timestamp('purchased_at')->nullable();
            $table->timestamp('sold_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('second_hand_boards');
    }
};