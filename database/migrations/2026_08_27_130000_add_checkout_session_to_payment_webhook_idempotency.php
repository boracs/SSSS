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
            if (! Schema::hasColumn('payment_webhook_idempotency', 'checkout_url')) {
                $table->text('checkout_url')->nullable()->after('idempotency_token');
            }

            if (! Schema::hasColumn('payment_webhook_idempotency', 'expires_at')) {
                $table->timestamp('expires_at')->nullable()->after('status');
            }
        });
    }

    public function down(): void
    {
        Schema::table('payment_webhook_idempotency', function (Blueprint $table) {
            if (Schema::hasColumn('payment_webhook_idempotency', 'expires_at')) {
                $table->dropColumn('expires_at');
            }

            if (Schema::hasColumn('payment_webhook_idempotency', 'checkout_url')) {
                $table->dropColumn('checkout_url');
            }
        });
    }
};
