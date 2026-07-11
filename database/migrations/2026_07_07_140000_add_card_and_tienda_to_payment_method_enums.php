<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Stripe Checkout y pago presencial en tienda requieren valores fuera del ENUM legacy.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE `bookings` MODIFY `payment_method` ENUM('bizum', 'transferencia', 'card', 'tienda') NULL");
        DB::statement("ALTER TABLE `lesson_user` MODIFY `payment_method` ENUM('bizum', 'transferencia', 'bono_vip', 'card', 'tienda') NULL");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE `bookings` MODIFY `payment_method` ENUM('bizum', 'transferencia') NULL");
        DB::statement("ALTER TABLE `lesson_user` MODIFY `payment_method` ENUM('bizum', 'transferencia', 'bono_vip') NULL");
    }
};
