<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Alquileres: la señal del 30% online deja un resto por cobrar en mostrador
 * (datáfono o efectivo). Este campo es la fuente de verdad de si ese resto
 * sigue pendiente, ya se cobró, o no aplica (prepago íntegro / walk-in).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->string('balance_status', 20)->default('none')->after('deposit_amount');
            $table->string('balance_payment_method', 20)->nullable()->after('balance_status');
            $table->dateTime('balance_paid_at')->nullable()->after('balance_payment_method');
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn(['balance_status', 'balance_payment_method', 'balance_paid_at']);
        });
    }
};
