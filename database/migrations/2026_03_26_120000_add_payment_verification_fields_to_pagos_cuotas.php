<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pagos_cuotas', function (Blueprint $table) {
            if (! Schema::hasColumn('pagos_cuotas', 'status')) {
                $table->enum('status', ['pending', 'submitted', 'confirmed'])
                    ->default('pending')
                    ->after('monto_pagado');
            }
            if (! Schema::hasColumn('pagos_cuotas', 'payment_proof_path')) {
                $table->string('payment_proof_path', 500)
                    ->nullable()
                    ->after('status');
            }
            if (! Schema::hasColumn('pagos_cuotas', 'proof_uploaded_at')) {
                $table->timestamp('proof_uploaded_at')
                    ->nullable()
                    ->after('payment_proof_path');
            }
            if (! Schema::hasColumn('pagos_cuotas', 'payment_method')) {
                $table->string('payment_method', 30)
                    ->nullable()
                    ->after('proof_uploaded_at');
            }
            if (! Schema::hasColumn('pagos_cuotas', 'admin_notes')) {
                $table->text('admin_notes')
                    ->nullable()
                    ->after('payment_method');
            }
        });
    }

    public function down(): void
    {
        Schema::table('pagos_cuotas', function (Blueprint $table) {
            foreach (['admin_notes', 'payment_method', 'proof_uploaded_at', 'payment_proof_path', 'status'] as $col) {
                if (Schema::hasColumn('pagos_cuotas', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};

