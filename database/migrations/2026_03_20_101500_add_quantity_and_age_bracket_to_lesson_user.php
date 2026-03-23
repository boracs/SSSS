<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lesson_user', function (Blueprint $table) {
            $table->unsignedInteger('quantity')->default(1)->after('party_size');
            $table->string('age_bracket', 20)->nullable()->after('quantity'); // children|adult|family
        });
    }

    public function down(): void
    {
        Schema::table('lesson_user', function (Blueprint $table) {
            $table->dropColumn(['quantity', 'age_bracket']);
        });
    }
};

