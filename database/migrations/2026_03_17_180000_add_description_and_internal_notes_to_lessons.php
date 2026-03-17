<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lessons', function (Blueprint $table) {
            if (! Schema::hasColumn('lessons', 'description')) {
                $table->text('description')->nullable()->after('title');
            }
            if (! Schema::hasColumn('lessons', 'internal_notes')) {
                $table->text('internal_notes')->nullable()->after('location');
            }
        });
    }

    public function down(): void
    {
        Schema::table('lessons', function (Blueprint $table) {
            if (Schema::hasColumn('lessons', 'description')) {
                $table->dropColumn('description');
            }
            if (Schema::hasColumn('lessons', 'internal_notes')) {
                $table->dropColumn('internal_notes');
            }
        });
    }
};
