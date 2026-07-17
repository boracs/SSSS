<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('surf_daily_briefs', function (Blueprint $table) {
            $table->id();
            $table->date('report_date')->unique();

            // Snapshot crudo (siempre lo que devolvió el modelo, para poder recalibrar después).
            $table->decimal('wave_height_m', 5, 2)->nullable();
            $table->decimal('wave_period_s', 5, 2)->nullable();
            $table->unsignedSmallInteger('wave_direction_deg')->nullable();
            $table->decimal('swell_height_m', 5, 2)->nullable();
            $table->decimal('swell_period_s', 5, 2)->nullable();
            $table->unsignedSmallInteger('swell_direction_deg')->nullable();
            $table->decimal('wind_speed_kmh', 5, 2)->nullable();
            $table->unsignedSmallInteger('wind_direction_deg')->nullable();

            // Derivados (calculados por SurfEnergyCalculator / SurfLevelRecommender).
            $table->decimal('energy_index', 6, 2)->nullable();
            $table->string('energy_label', 40)->nullable();
            $table->string('level_recommendation', 40)->nullable();

            // Texto del día (IA o plantilla de respaldo).
            $table->text('ai_summary')->nullable();
            $table->string('summary_source', 30)->default('pending'); // gemini | fallback_template | pending
            $table->timestamp('generated_at')->nullable();

            // Override manual de la escuela: si está presente, manda por encima del cálculo.
            $table->string('admin_override_status', 20)->nullable(); // closed | caution | good
            $table->text('admin_override_note')->nullable();
            $table->foreignId('admin_override_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('admin_override_at')->nullable();

            $table->timestamp('fetched_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('surf_daily_briefs');
    }
};
