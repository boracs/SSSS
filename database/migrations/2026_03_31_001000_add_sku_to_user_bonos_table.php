<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_bonos', function (Blueprint $table) {
            $table->string('sku', 40)->nullable()->after('id');
        });

        DB::table('user_bonos')
            ->orderBy('id')
            ->get(['id', 'created_at'])
            ->each(function ($row) {
                $year = $row->created_at ? date('Y', strtotime((string) $row->created_at)) : date('Y');
                $sku = sprintf('CR-%s-%06d', $year, (int) $row->id);
                DB::table('user_bonos')->where('id', (int) $row->id)->update(['sku' => $sku]);
            });

        Schema::table('user_bonos', function (Blueprint $table) {
            $table->unique('sku');
        });
    }

    public function down(): void
    {
        Schema::table('user_bonos', function (Blueprint $table) {
            $table->dropUnique(['sku']);
            $table->dropColumn('sku');
        });
    }
};

