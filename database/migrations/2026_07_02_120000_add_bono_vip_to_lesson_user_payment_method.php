<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE `lesson_user` MODIFY `payment_method` ENUM('bizum', 'transferencia', 'bono_vip') NULL");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE `lesson_user` MODIFY `payment_method` ENUM('bizum', 'transferencia') NULL");
    }
};
