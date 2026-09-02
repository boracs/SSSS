<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A1: unidades realmente cobradas. Nullable a propósito — filas viejas
 * y consumos sin bono (user_bono_id NULL) quedan sin dato; el refund
 * usa entonces el cálculo legacy (unitsForCharge por quantity).
 * No hay backfill: reconstruir ocupación al cobrar inventaría valores.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('bono_consumptions', 'units_consumed')) {
            return;
        }

        Schema::table('bono_consumptions', function (Blueprint $table) {
            $table->unsignedTinyInteger('units_consumed')->nullable()->after('remaining_after');
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('bono_consumptions', 'units_consumed')) {
            return;
        }

        Schema::table('bono_consumptions', function (Blueprint $table) {
            $table->dropColumn('units_consumed');
        });
    }
};
