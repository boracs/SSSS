<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Packs de alquiler: tramos cortos en minutos (60/90/120/180/240/360)
 * y tramos largos en días (1d…5d + semana). Retira 1h/2h/4h/12h/24h/48h/72h.
 */
return new class extends Migration
{
    private const NEW_COLUMNS = [
        'price_60m',
        'price_90m',
        'price_120m',
        'price_180m',
        'price_240m',
        'price_360m',
        'price_1d',
        'price_2d',
        'price_3d',
        'price_4d',
        'price_5d',
    ];

    private const OLD_COLUMNS = [
        'price_1h',
        'price_2h',
        'price_4h',
        'price_12h',
        'price_24h',
        'price_48h',
        'price_72h',
    ];

    public function up(): void
    {
        Schema::table('price_schemas', function (Blueprint $table) {
            foreach (self::NEW_COLUMNS as $column) {
                $table->decimal($column, 8, 2)->default(0);
            }
        });

        foreach (DB::table('price_schemas')->get() as $schema) {
            $h1 = (float) $schema->price_1h;
            $h2 = (float) $schema->price_2h;
            $h4 = (float) $schema->price_4h;
            $h12 = (float) $schema->price_12h;
            $d1 = (float) $schema->price_24h;
            $d2 = (float) $schema->price_48h;
            $d3 = (float) $schema->price_72h;
            $week = (float) $schema->price_week;

            // 6 h no existía: se interpola entre 4 h y el antiguo 12 h (o 25% sobre 4 h).
            $h6 = $h12 > 0 ? ($h4 + $h12) / 2 : $h4 * 1.25;
            // 4d y 5d se reparten el tramo 3d → semana (4 días de diferencia).
            $dayStep = $week > $d3 ? ($week - $d3) / 4 : $d3 / 3;

            DB::table('price_schemas')->where('id', $schema->id)->update([
                'price_60m' => round($h1, 2),
                'price_90m' => round(($h1 + $h2) / 2, 2),
                'price_120m' => round($h2, 2),
                'price_180m' => round(($h2 + $h4) / 2, 2),
                'price_240m' => round($h4, 2),
                'price_360m' => round($h6, 2),
                'price_1d' => round($d1, 2),
                'price_2d' => round($d2, 2),
                'price_3d' => round($d3, 2),
                'price_4d' => round($d3 + $dayStep, 2),
                'price_5d' => round($d3 + (2 * $dayStep), 2),
            ]);
        }

        Schema::table('price_schemas', function (Blueprint $table) {
            $table->dropColumn(self::OLD_COLUMNS);
        });
    }

    public function down(): void
    {
        Schema::table('price_schemas', function (Blueprint $table) {
            foreach (self::OLD_COLUMNS as $column) {
                $table->decimal($column, 8, 2)->default(0);
            }
        });

        foreach (DB::table('price_schemas')->get() as $schema) {
            $h4 = (float) $schema->price_240m;
            $d1 = (float) $schema->price_1d;

            DB::table('price_schemas')->where('id', $schema->id)->update([
                'price_1h' => round((float) $schema->price_60m, 2),
                'price_2h' => round((float) $schema->price_120m, 2),
                'price_4h' => round($h4, 2),
                'price_12h' => round(($h4 + $d1) / 2, 2),
                'price_24h' => round($d1, 2),
                'price_48h' => round((float) $schema->price_2d, 2),
                'price_72h' => round((float) $schema->price_3d, 2),
            ]);
        }

        Schema::table('price_schemas', function (Blueprint $table) {
            $table->dropColumn(self::NEW_COLUMNS);
        });
    }
};
