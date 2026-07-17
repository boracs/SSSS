<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\SurfConditions\SurfDailyBriefService;
use Illuminate\Console\Command;

/**
 * Genera el "Parte S4 de Zurriola" del día (oleaje/viento/energía + resumen
 * por IA). Programado en routes/console.php cada 6 h con --force; también
 * ejecutable a mano (ej. si el mar cambia entre ciclos del cron).
 */
final class GenerateSurfDailyBrief extends Command
{
    protected $signature = 'surf:generate-daily-brief {--force : Regenera aunque ya exista un parte completo hoy}';

    protected $description = 'Genera el parte diario de condiciones de Zurriola (Open-Meteo + resumen Gemini)';

    public function handle(SurfDailyBriefService $service): int
    {
        $brief = $service->generateForToday(force: (bool) $this->option('force'));

        $this->info(sprintf(
            'Parte del %s generado (fuente: %s, nivel: %s).',
            $brief->report_date?->toDateString() ?? '—',
            $brief->summary_source,
            $brief->level_recommendation ?? '—',
        ));

        return self::SUCCESS;
    }
}
