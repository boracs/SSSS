<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('lesson_user')->where('payment_status', 'submitted')->update(['payment_status' => 'pending']);
        DB::table('bookings')->where('payment_status', 'submitted')->update(['payment_status' => 'pending']);
        DB::table('pagos_cuotas')->where('status', 'submitted')->update(['status' => 'pending']);

        DB::statement("ALTER TABLE lesson_user MODIFY COLUMN payment_status ENUM('pending','confirmed','rejected') NOT NULL DEFAULT 'pending'");
        DB::statement("ALTER TABLE bookings MODIFY COLUMN payment_status ENUM('pending','confirmed','rejected') NOT NULL DEFAULT 'pending'");
        DB::statement("ALTER TABLE pagos_cuotas MODIFY COLUMN status ENUM('pending','confirmed','rejected') NOT NULL DEFAULT 'pending'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE lesson_user MODIFY COLUMN payment_status ENUM('pending','submitted','confirmed','rejected') NOT NULL DEFAULT 'pending'");
        DB::statement("ALTER TABLE bookings MODIFY COLUMN payment_status ENUM('pending','submitted','confirmed','rejected') NOT NULL DEFAULT 'pending'");
        DB::statement("ALTER TABLE pagos_cuotas MODIFY COLUMN status ENUM('pending','submitted','confirmed','rejected') NOT NULL DEFAULT 'pending'");
    }
};
