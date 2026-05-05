<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lesson_user', function (Blueprint $table) {
            if (! Schema::hasColumn('lesson_user', 'refund_status')) {
                $table->enum('refund_status', ['pending', 'completed'])
                    ->nullable()
                    ->after('reviewed_at');
            }
        });

        Schema::table('bookings', function (Blueprint $table) {
            if (! Schema::hasColumn('bookings', 'refund_status')) {
                $table->enum('refund_status', ['pending', 'completed'])
                    ->nullable()
                    ->after('reviewed_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('lesson_user', function (Blueprint $table) {
            if (Schema::hasColumn('lesson_user', 'refund_status')) {
                $table->dropColumn('refund_status');
            }
        });

        Schema::table('bookings', function (Blueprint $table) {
            if (Schema::hasColumn('bookings', 'refund_status')) {
                $table->dropColumn('refund_status');
            }
        });
    }
};
