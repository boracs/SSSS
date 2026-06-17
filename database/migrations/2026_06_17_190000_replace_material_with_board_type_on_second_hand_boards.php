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
        Schema::table('second_hand_boards', function (Blueprint $table) {
            $table->string('board_type', 20)->nullable()->after('model');
        });

        DB::table('second_hand_boards')->where('material', 'corcho')->update(['board_type' => 'softboard']);
        DB::table('second_hand_boards')->whereIn('material', ['fibra', 'epoxy'])->update(['board_type' => 'hardboard']);

        Schema::table('second_hand_boards', function (Blueprint $table) {
            $table->dropColumn('material');
        });
    }

    public function down(): void
    {
        Schema::table('second_hand_boards', function (Blueprint $table) {
            $table->string('material', 40)->nullable()->after('model');
        });

        DB::table('second_hand_boards')->where('board_type', 'softboard')->update(['material' => 'corcho']);
        DB::table('second_hand_boards')->where('board_type', 'hardboard')->update(['material' => 'fibra']);

        Schema::table('second_hand_boards', function (Blueprint $table) {
            $table->dropColumn('board_type');
        });
    }
};