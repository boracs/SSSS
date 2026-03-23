<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lessons', function (Blueprint $table) {
            if (! Schema::hasColumn('lessons', 'modality')) {
                $table->string('modality', 20)->default('grupal')->after('type');
            }
            if (! Schema::hasColumn('lessons', 'batch_id')) {
                $table->string('batch_id', 64)->nullable()->after('modality');
            }
        });

        // Backfill para no romper compatibilidad:
        // - is_private => particular
        // - type === weekly => semanal
        // - else => grupal
        DB::statement("
            UPDATE lessons
            SET modality =
                CASE
                    WHEN IFNULL(is_private, 0) = 1 THEN 'particular'
                    WHEN IFNULL(type, '') = 'weekly' THEN 'semanal'
                    ELSE 'grupal'
                END
        ");
    }

    public function down(): void
    {
        Schema::table('lessons', function (Blueprint $table) {
            if (Schema::hasColumn('lessons', 'batch_id')) {
                $table->dropColumn('batch_id');
            }
            if (Schema::hasColumn('lessons', 'modality')) {
                $table->dropColumn('modality');
            }
        });
    }
};

