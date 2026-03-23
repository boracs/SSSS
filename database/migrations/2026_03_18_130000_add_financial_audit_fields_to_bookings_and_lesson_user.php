<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lesson_user', function (Blueprint $table) {
            if (! Schema::hasColumn('lesson_user', 'payment_status')) {
                $table->enum('payment_status', ['pending', 'submitted', 'confirmed'])->default('pending')->after('status');
            }
        });

        Schema::table('bookings', function (Blueprint $table) {
            if (! Schema::hasColumn('bookings', 'payment_status')) {
                $table->enum('payment_status', ['pending', 'submitted', 'confirmed'])->default('pending')->after('status');
            }
            if (! Schema::hasColumn('bookings', 'payment_proof_path')) {
                $table->string('payment_proof_path', 500)->nullable()->after('payment_status');
            }
            if (! Schema::hasColumn('bookings', 'proof_uploaded_at')) {
                $table->timestamp('proof_uploaded_at')->nullable()->after('payment_proof_path');
            }
            if (! Schema::hasColumn('bookings', 'payment_method')) {
                $table->enum('payment_method', ['bizum', 'transferencia'])->nullable()->after('proof_uploaded_at');
            }
            if (! Schema::hasColumn('bookings', 'admin_notes')) {
                $table->text('admin_notes')->nullable()->after('payment_method');
            }
        });
    }

    public function down(): void
    {
        Schema::table('lesson_user', function (Blueprint $table) {
            if (Schema::hasColumn('lesson_user', 'payment_status')) {
                $table->dropColumn('payment_status');
            }
        });

        Schema::table('bookings', function (Blueprint $table) {
            foreach (['admin_notes', 'payment_method', 'proof_uploaded_at', 'payment_proof_path', 'payment_status'] as $col) {
                if (Schema::hasColumn('bookings', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};

