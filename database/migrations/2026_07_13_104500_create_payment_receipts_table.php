<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_receipts', function (Blueprint $table) {
            $table->id();
            $table->string('payable_type', 120);
            $table->unsignedBigInteger('payable_id');
            $table->string('stripe_checkout_session_id', 120)->unique();
            $table->string('stripe_payment_intent_id', 120)->nullable();
            $table->string('receipt_url', 500)->nullable();
            $table->string('storage_path', 500)->nullable();
            $table->timestamp('captured_at')->nullable();
            $table->timestamps();

            $table->unique(['payable_type', 'payable_id']);
            $table->index(['payable_type', 'payable_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_receipts');
    }
};
