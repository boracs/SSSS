<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE lesson_user MODIFY status VARCHAR(40) NOT NULL DEFAULT "enrolled"');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE lesson_user MODIFY status VARCHAR(20) NOT NULL DEFAULT "enrolled"');
    }
};

