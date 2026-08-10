<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Señal online + resto pendiente en clases particulares (mismo modelo que
 * bookings): se cobra un % por la web y el resto se liquida en mostrador.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lesson_user', function (Blueprint $table) {
            $table->unsignedInteger('deposit_amount_cents')->default(0)->after('payment_method');
            $table->string('balance_status', 20)->default('none')->after('deposit_amount_cents');
            $table->string('balance_payment_method', 20)->nullable()->after('balance_status');
            $table->dateTime('balance_paid_at')->nullable()->after('balance_payment_method');
        });
    }

    public function down(): void
    {
        Schema::table('lesson_user', function (Blueprint $table) {
            $table->dropColumn([
                'deposit_amount_cents',
                'balance_status',
                'balance_payment_method',
                'balance_paid_at',
            ]);
        });
    }
};
