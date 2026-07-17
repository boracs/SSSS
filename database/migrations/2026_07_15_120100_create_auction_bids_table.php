<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('auction_bids', function (Blueprint $table) {
            $table->id();
            $table->foreignId('auction_id')->constrained('auctions')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedInteger('amount_cents')->comment('Importe puja en céntimos EUR');
            $table->string('status', 24)->default('winning')->index();
            $table->timestamps();

            $table->index(['auction_id', 'amount_cents']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('auction_bids');
    }
};
