<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('surfboards', function (Blueprint $table) {
            if (! Schema::hasColumn('surfboards', 'altura')) {
                $table->string('altura', 50)->nullable()->after('description');
            }
            if (! Schema::hasColumn('surfboards', 'ancho')) {
                $table->string('ancho', 50)->nullable()->after('altura');
            }
            if (! Schema::hasColumn('surfboards', 'grosor')) {
                $table->string('grosor', 50)->nullable()->after('ancho');
            }
            if (! Schema::hasColumn('surfboards', 'volumen')) {
                $table->decimal('volumen', 8, 2)->nullable()->after('grosor');
            }
        });
    }

    public function down(): void
    {
        Schema::table('surfboards', function (Blueprint $table) {
            foreach (['volumen', 'grosor', 'ancho', 'altura'] as $col) {
                if (Schema::hasColumn('surfboards', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};

