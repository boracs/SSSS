<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('surfboards', function (Blueprint $table) {
            $table->string('slug', 120)->nullable()->after('name');
            $table->string('image_alt', 255)->nullable()->after('image_url');
        });
    }

    public function down(): void
    {
        Schema::table('surfboards', function (Blueprint $table) {
            $table->dropColumn(['slug', 'image_alt']);
        });
    }
};
