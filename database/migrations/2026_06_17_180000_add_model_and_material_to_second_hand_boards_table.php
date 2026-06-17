<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('second_hand_boards', function (Blueprint $table) {
            $table->string('model', 100)->nullable()->after('brand');
            $table->string('material', 40)->nullable()->after('model');
        });
    }

    public function down(): void
    {
        Schema::table('second_hand_boards', function (Blueprint $table) {
            $table->dropColumn(['model', 'material']);
        });
    }
};