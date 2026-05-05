<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lesson_user', function (Blueprint $table) {
            $table->timestamp('reviewed_at')->nullable()->after('proof_uploaded_at');
        });

        Schema::table('bookings', function (Blueprint $table) {
            $table->timestamp('reviewed_at')->nullable()->after('proof_uploaded_at');
        });

        Schema::table('user_bonos', function (Blueprint $table) {
            $table->timestamp('reviewed_at')->nullable()->after('payment_proof_path');
        });
    }

    public function down(): void
    {
        Schema::table('lesson_user', function (Blueprint $table) {
            $table->dropColumn('reviewed_at');
        });

        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn('reviewed_at');
        });

        Schema::table('user_bonos', function (Blueprint $table) {
            $table->dropColumn('reviewed_at');
        });
    }
};
