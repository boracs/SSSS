<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Añade índices para acelerar filtros de listados admin y queries de academia.
     *
     * - lesson_user: status (enrolled/attended/cancelled), expires_at (pending), cancelled_at (histórico)
     * - bookings: status (pending/confirmed/completed/cancelled), expires_at (pending), balance_status
     */
    public function up(): void
    {
        // lesson_user — academia y mis reservas
        Schema::table('lesson_user', function (Blueprint $table) {
            $table->index('status');
            $table->index('expires_at');
            $table->index('cancelled_at');
        });

        // bookings — listados admin y filtros de alquileres
        Schema::table('bookings', function (Blueprint $table) {
            $table->index('status');
            $table->index('expires_at');
            $table->index('balance_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('lesson_user', function (Blueprint $table) {
            $table->dropIndex(['status']);
            $table->dropIndex(['expires_at']);
            $table->dropIndex(['cancelled_at']);
        });

        Schema::table('bookings', function (Blueprint $table) {
            $table->dropIndex(['status']);
            $table->dropIndex(['expires_at']);
            $table->dropIndex(['balance_status']);
        });
    }
};
