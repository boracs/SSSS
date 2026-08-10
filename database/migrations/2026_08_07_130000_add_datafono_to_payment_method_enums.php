<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Conciliación de cobros TPV: bookings/lesson_user deben aceptar payment_method=datafono.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE `bookings` MODIFY `payment_method` ENUM('bizum', 'transferencia', 'card', 'tienda', 'datafono') NULL");
        DB::statement("ALTER TABLE `lesson_user` MODIFY `payment_method` ENUM('bizum', 'transferencia', 'bono_vip', 'card', 'tienda', 'datafono') NULL");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE `bookings` MODIFY `payment_method` ENUM('bizum', 'transferencia', 'card', 'tienda') NULL");
        DB::statement("ALTER TABLE `lesson_user` MODIFY `payment_method` ENUM('bizum', 'transferencia', 'bono_vip', 'card', 'tienda') NULL");
    }
};
