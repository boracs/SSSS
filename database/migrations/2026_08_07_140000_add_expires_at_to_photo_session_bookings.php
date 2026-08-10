<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('photo_session_bookings', function (Blueprint $table) {
            $table->timestamp('expires_at')->nullable()->after('admin_notes');
            $table->index(['status', 'payment_status', 'expires_at']);
        });
    }

    public function down(): void
    {
        Schema::table('photo_session_bookings', function (Blueprint $table) {
            $table->dropIndex(['status', 'payment_status', 'expires_at']);
            $table->dropColumn('expires_at');
        });
    }
};
