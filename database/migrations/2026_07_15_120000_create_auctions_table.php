<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('auctions', function (Blueprint $table) {
            $table->id();
            $table->string('title', 160);
            $table->string('slug', 180)->unique();
            $table->text('description')->nullable();
            $table->string('category', 32)->default('surfboard');
            $table->json('images')->nullable();
            $table->unsignedInteger('starting_price_cents')->comment('Precio salida en céntimos EUR');
            $table->unsignedInteger('current_price_cents')->comment('Puja actual en céntimos EUR');
            $table->unsignedInteger('min_increment_cents')->default(500)->comment('Incremento mínimo en céntimos');
            $table->unsignedInteger('reserve_price_cents')->nullable()->comment('Precio reserva opcional');
            $table->unsignedInteger('bid_count')->default(0);
            $table->string('status', 24)->default('draft')->index();
            $table->string('payment_status', 24)->nullable();
            $table->foreignId('winner_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('starts_at')->nullable()->index();
            $table->timestamp('ends_at')->nullable()->index();
            $table->timestamp('settled_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('auctions');
    }
};
