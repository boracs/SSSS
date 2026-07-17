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
            $table->unsignedInteger('likes_count')->default(0)->after('fetched_at');
            $table->unsignedInteger('dislikes_count')->default(0)->after('likes_count');
        });

        Schema::create('surf_brief_votes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('surf_daily_brief_id')->constrained('surf_daily_briefs')->cascadeOnDelete();
            $table->string('reaction', 10); // up | down
            $table->string('voter_key', 64);
            $table->timestamps();

            $table->unique(['surf_daily_brief_id', 'voter_key']);
            $table->index(['surf_daily_brief_id', 'reaction']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('surf_brief_votes');

        Schema::table('surf_daily_briefs', function (Blueprint $table) {
            $table->dropColumn(['likes_count', 'dislikes_count']);
        });
    }
};
