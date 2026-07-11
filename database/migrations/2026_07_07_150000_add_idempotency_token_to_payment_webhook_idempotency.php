<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payment_webhook_idempotency', function (Blueprint $table) {
            if (! Schema::hasColumn('payment_webhook_idempotency', 'idempotency_token')) {
                $table->string('idempotency_token', 64)->nullable()->after('transaction_id');
                $table->index('idempotency_token');
            }
        });
    }

    public function down(): void
    {
        Schema::table('payment_webhook_idempotency', function (Blueprint $table) {
            if (Schema::hasColumn('payment_webhook_idempotency', 'idempotency_token')) {
                $table->dropIndex(['idempotency_token']);
                $table->dropColumn('idempotency_token');
            }
        });
    }
};
