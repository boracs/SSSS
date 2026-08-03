<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('surf_daily_briefs', function (Blueprint $table) {
            $table->json('ai_summary_sections')->nullable()->after('ai_summary');
        });
    }

    public function down(): void
    {
        Schema::table('surf_daily_briefs', function (Blueprint $table) {
            $table->dropColumn('ai_summary_sections');
        });
    }
};
