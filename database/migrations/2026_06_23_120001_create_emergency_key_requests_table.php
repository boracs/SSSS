<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('emergency_key_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamp('requested_at');
            $table->char('resolved_code_shown', 4);
            $table->timestamp('admin_key_deactivated_at')->nullable();
            $table->foreignId('admin_key_deactivated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('requested_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('emergency_key_requests');
    }
};
