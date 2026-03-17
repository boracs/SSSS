<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bookings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('surfboard_id')->constrained('surfboards')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('client_name');
            $table->string('client_email')->nullable();
            $table->string('client_phone')->nullable();
            $table->dateTime('start_date');
            $table->dateTime('end_date');
            $table->dateTime('expires_at')->nullable(); // caducidad para pending
            $table->string('status', 20)->default('pending'); // pending, confirmed, completed, cancelled
            $table->decimal('total_price', 10, 2)->default(0);
            $table->decimal('deposit_amount', 10, 2)->default(0);
            $table->text('payment_proof_note')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bookings');
    }
};
