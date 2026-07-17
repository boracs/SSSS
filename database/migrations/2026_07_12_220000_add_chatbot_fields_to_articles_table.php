<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('articles', function (Blueprint $table): void {
            $table->text('chatbot_summary')->nullable()->after('meta_keywords');
            $table->string('chatbot_keywords', 500)->nullable()->after('chatbot_summary');
        });
    }

    public function down(): void
    {
        Schema::table('articles', function (Blueprint $table): void {
            $table->dropColumn(['chatbot_summary', 'chatbot_keywords']);
        });
    }
};
