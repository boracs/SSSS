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
        Schema::table('auctions', function (Blueprint $table) {
            $table->timestamp('payment_deadline_at')->nullable()->after('settled_at');
        });

        DB::table('auctions')
            ->where('status', 'ended')
            ->where('payment_status', 'pending')
            ->whereNull('payment_deadline_at')
            ->update(['payment_deadline_at' => now()->addMinutes(1440)]);
    }

    public function down(): void
    {
        Schema::table('auctions', function (Blueprint $table) {
            $table->dropColumn('payment_deadline_at');
        });
    }
};
