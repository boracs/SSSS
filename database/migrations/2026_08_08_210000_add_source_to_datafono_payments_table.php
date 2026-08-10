<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('datafono_payments', function (Blueprint $table) {
            $table->string('source', 20)->default('manual_cash')->after('status');
            $table->json('raw_payload')->nullable()->after('notes');
        });

        // MySQL: UNIQUE permite varios NULL → equivale a unique parcial sobre refs informadas.
        Schema::table('datafono_payments', function (Blueprint $table) {
            $table->unique('external_reference', 'datafono_payments_external_reference_unique');
        });

        DB::table('payment_terminals')
            ->where('codigo', 'datafono2')
            ->update(['activo' => false, 'updated_at' => now()]);
    }

    public function down(): void
    {
        Schema::table('datafono_payments', function (Blueprint $table) {
            $table->dropUnique('datafono_payments_external_reference_unique');
            $table->dropColumn(['source', 'raw_payload']);
        });

        DB::table('payment_terminals')
            ->where('codigo', 'datafono2')
            ->update(['activo' => true, 'updated_at' => now()]);
    }
};
