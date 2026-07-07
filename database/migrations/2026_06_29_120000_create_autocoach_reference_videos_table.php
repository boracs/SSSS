<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('autocoach_reference_videos', function (Blueprint $table) {
            $table->id();
            $table->string('sport', 64);
            $table->string('posture', 64);
            $table->string('trick', 191);
            $table->string('file_path');
            $table->timestamps();

            $table->unique(['sport', 'posture', 'trick'], 'autocoach_ref_unique');
            $table->index(['sport', 'posture']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('autocoach_reference_videos');
    }
};
