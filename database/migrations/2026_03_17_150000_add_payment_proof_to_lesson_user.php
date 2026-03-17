<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lesson_user', function (Blueprint $table) {
            if (! Schema::hasColumn('lesson_user', 'payment_proof_path')) {
                $table->string('payment_proof_path', 500)->nullable()->after('expires_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('lesson_user', function (Blueprint $table) {
            if (Schema::hasColumn('lesson_user', 'payment_proof_path')) {
                $table->dropColumn('payment_proof_path');
            }
        });
    }
};
