<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lesson_user', function (Blueprint $table) {
            if (! Schema::hasColumn('lesson_user', 'proof_uploaded_at')) {
                $table->timestamp('proof_uploaded_at')->nullable()->after('payment_proof_path');
            }
            if (! Schema::hasColumn('lesson_user', 'payment_method')) {
                $table->enum('payment_method', ['bizum', 'transferencia'])->nullable()->after('proof_uploaded_at');
            }
            if (! Schema::hasColumn('lesson_user', 'admin_notes')) {
                $table->text('admin_notes')->nullable()->after('payment_method');
            }
        });
    }

    public function down(): void
    {
        Schema::table('lesson_user', function (Blueprint $table) {
            if (Schema::hasColumn('lesson_user', 'admin_notes')) {
                $table->dropColumn('admin_notes');
            }
            if (Schema::hasColumn('lesson_user', 'payment_method')) {
                $table->dropColumn('payment_method');
            }
            if (Schema::hasColumn('lesson_user', 'proof_uploaded_at')) {
                $table->dropColumn('proof_uploaded_at');
            }
        });
    }
};

