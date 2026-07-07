<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('emergency_key_requests', function (Blueprint $table) {
            if (! Schema::hasColumn('emergency_key_requests', 'admin_key_recovered_at')) {
                $table->timestamp('admin_key_recovered_at')->nullable()->after('admin_key_deactivated_by');
            }
            if (! Schema::hasColumn('emergency_key_requests', 'admin_key_recovered_by')) {
                $table->foreignId('admin_key_recovered_by')->nullable()->after('admin_key_recovered_at')
                    ->constrained('users')->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('emergency_key_requests', function (Blueprint $table) {
            if (Schema::hasColumn('emergency_key_requests', 'admin_key_recovered_by')) {
                $table->dropConstrainedForeignId('admin_key_recovered_by');
            }
            if (Schema::hasColumn('emergency_key_requests', 'admin_key_recovered_at')) {
                $table->dropColumn('admin_key_recovered_at');
            }
        });
    }
};
