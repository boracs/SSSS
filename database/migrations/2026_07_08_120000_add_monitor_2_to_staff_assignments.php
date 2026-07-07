<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE staff_assignments MODIFY role ENUM('monitor', 'monitor_2', 'fotografo') NOT NULL");
    }

    public function down(): void
    {
        DB::table('staff_assignments')->where('role', 'monitor_2')->delete();
        DB::statement("ALTER TABLE staff_assignments MODIFY role ENUM('monitor', 'fotografo') NOT NULL");
    }
};
