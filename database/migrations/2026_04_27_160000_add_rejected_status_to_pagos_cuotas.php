<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE pagos_cuotas MODIFY COLUMN status ENUM('pending','submitted','confirmed','rejected') NOT NULL DEFAULT 'pending'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE pagos_cuotas MODIFY COLUMN status ENUM('pending','submitted','confirmed') NOT NULL DEFAULT 'pending'");
    }
};
