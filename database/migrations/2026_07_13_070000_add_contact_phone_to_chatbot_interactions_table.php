<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('chatbot_interactions', function (Blueprint $table) {
            $table->string('contact_phone', 20)->nullable()->after('ip_address');
            $table->timestamp('contact_phone_captured_at')->nullable()->after('contact_phone');
        });
    }

    public function down(): void
    {
        Schema::table('chatbot_interactions', function (Blueprint $table) {
            $table->dropColumn(['contact_phone', 'contact_phone_captured_at']);
        });
    }
};
