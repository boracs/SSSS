<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pedidos', function (Blueprint $table) {
            $table->string('payment_proof_path')->nullable()->after('entregado');
            $table->string('payment_method', 32)->nullable()->after('payment_proof_path');
            $table->timestamp('proof_uploaded_at')->nullable()->after('payment_method');
        });
    }

    public function down(): void
    {
        Schema::table('pedidos', function (Blueprint $table) {
            $table->dropColumn(['payment_proof_path', 'payment_method', 'proof_uploaded_at']);
        });
    }
};
