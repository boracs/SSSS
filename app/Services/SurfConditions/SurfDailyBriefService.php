<?php

declare(strict_types=1);

namespace App\Services\SurfConditions;

use App\DTOs\SurfConditions\SurfConditionsSnapshotDto;
use App\DTOs\SurfConditions\SurfForecastDayDto;
use App\DTOs\SurfConditions\SurfForecastSlotDto;
use App\Exceptions\Chatbot\GeminiUnavailableException;
use App\Exceptions\SurfConditions\SurfConditionsUnavailableException;
use App\Models\SurfDailyBrief;
use App\Models\User;
use App\Services\Chatbot\GoogleAIService;
use App\Support\CompassDirection;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Orquestador del "Parte S4 de Zurriola": pide el snapshot a Open-Meteo,
 * calcula energía/nivel, genera el resumen del día con Gemini (o plantilla de
 * respaldo si falla) usando la guía del spot como fuente de verdad, y
 * persiste UNA fila por día en `surf_daily_briefs`.
 *
 * Único punto de lectura para web/home y, más adelante, el chatbot — nadie
 * más debe golpear Open-Meteo ni Gemini para esto.
 */
final class SurfDailyBriefService
{
    private const CACHE_PREFIX = 'surf_daily_brief:';

    private const CACHE_TTL_SECONDS = 300;

    public function __construct(
        private readonly OpenMeteoMarineClient $marineClient,
        private readonly SurfEnergyCalculator $energyCalculator,
        private readonly SurfLevelRecommender $levelRecommender,
        private readonly GoogleAIService $googleAI,
        private readonly SurfForecastTableService $forecastTable,
        private readonly SurfBriefReactionService $reactions,
    ) {}

    /**
     * Genera (o reutiliza) el parte del día. Idempotente: si ya existe un
     * parte completo de hoy y no se fuerza, no vuelve a llamar a las APIs.
     */
    public function generateForToday(bool $force = false): SurfDailyBrief
    {
        $today = Carbon::today();

        $existing = SurfDailyBrief::query()->where('report_date', $today->toDateString())->first();
        if ($existing !== null && ! $force && $existing->summary_source !== SurfDailyBrief::SOURCE_PENDING) {
            return $existing;
        }

        try {
            $snapshot = $this->marineClient->currentSnapshot();
        } catch (SurfConditionsUnavailableException $e) {
            Log::warning('SurfDailyBriefService: Open-Meteo no disponible, se mantiene el último parte válido.', [
                'error' => $e->getMessage(),
            ]);

            return $existing ?? $this->persistTotalFailure($today);
        }

        $energyIndex = $this->energyCalculator->indexFor($snapshot);
        $energyLabel = $this->energyCalculator->labelFor($energyIndex);
        $level = $this->levelRecommender->recommend($snapshot);

        [$summary, $source] = $this->buildSummary($snapshot, $level, $energyLabel);

        $brief = SurfDailyBrief::query()->updateOrCreate(
            ['report_date' => $today->toDateString()],
            [
                'wave_height_m' => $snapshot->waveHeightM,
                'wave_period_s' => $snapshot->wavePeriodS,
                'wave_direction_deg' => $snapshot->waveDirectionDeg,
                'swell_height_m' => $snapshot->swellHeightM,
                'swell_period_s' => $snapshot->swellPeriodS,
                'swell_direction_deg' => $snapshot->swellDirectionDeg,
                'wind_speed_kmh' => $snapshot->windSpeedKmh,
                'wind_direction_deg' => $snapshot->windDirectionDeg,
                'energy_index' => $energyIndex,
                'energy_label' => $energyLabel,
                'level_recommendation' => $level,
                'ai_summary' => $summary,
                'summary_source' => $source,
                'generated_at' => Carbon::now(),
                'fetched_at' => $snapshot->fetchedAt,
            ],
        );

        $this->forget($today);

        return $brief;
    }

    public function today(): ?SurfDailyBrief
    {
        $date = Carbon::today()->toDateString();

        return Cache::remember(
            self::CACHE_PREFIX.$date,
            self::CACHE_TTL_SECONDS,
            fn () => SurfDailyBrief::query()->where('report_date', $date)->first(),
        );
    }

    public function setOverride(User $admin, ?string $status, ?string $note): SurfDailyBrief
    {
        $brief = $this->generateForToday();

        $brief->update([
            'admin_override_status' => $status,
            'admin_override_note' => $note,
            'admin_override_by' => $status !== null ? $admin->id : null,
            'admin_override_at' => $status !== null ? Carbon::now() : null,
        ]);

        $this->forget(Carbon::today());

        return $brief->refresh();
    }

    public function forget(Carbon $date): void
    {
        Cache::forget(self::CACHE_PREFIX.$date->toDateString());
    }

    /** @return array<string, mixed> */
    public function publicPayload(?Request $request = null): array
    {
        $brief = $this->today();

        if ($brief === null || $brief->summary_source === SurfDailyBrief::SOURCE_PENDING) {
            return ['has_data' => false];
        }

        // Contadores frescos (el modelo en cache puede ir unos minutos atrasado).
        $counts = SurfDailyBrief::query()
            ->whereKey($brief->id)
            ->first(['id', 'likes_count', 'dislikes_count']);

        if ($counts !== null) {
            $brief->likes_count = $counts->likes_count;
            $brief->dislikes_count = $counts->dislikes_count;
        }

        $voterKey = $request !== null ? $this->reactions->voterKey($request) : null;

        return [
            'has_data' => true,
            'report_date' => $brief->report_date?->toDateString(),
            'wave' => [
                'height_m' => $brief->wave_height_m,
                'period_s' => $brief->wave_period_s,
                'direction_deg' => $brief->wave_direction_deg,
                'direction_label' => $this->compassLabel($brief->wave_direction_deg),
            ],
            'swell' => $brief->swell_height_m !== null ? [
                'height_m' => $brief->swell_height_m,
                'period_s' => $brief->swell_period_s,
                'direction_deg' => $brief->swell_direction_deg,
                'direction_label' => $this->compassLabel($brief->swell_direction_deg),
            ] : null,
            'wind' => [
                'speed_kmh' => $brief->wind_speed_kmh,
                'direction_deg' => $brief->wind_direction_deg,
                'direction_label' => $this->compassLabel($brief->wind_direction_deg),
            ],
            'energy' => [
                'index' => $brief->energy_index,
                'label' => $brief->energy_label,
            ],
            'level' => [
                'value' => $brief->level_recommendation,
                'label' => $brief->level_recommendation !== null ? $this->levelRecommender->label($brief->level_recommendation) : null,
            ],
            'summary' => $brief->ai_summary,
            'summary_source' => $brief->summary_source,
            'generated_at' => $brief->generated_at?->toIso8601String(),
            'generated_at_human' => $brief->generated_at?->locale('es')->translatedFormat('d/m/Y H:i'),
            'override' => $brief->hasOverride() ? [
                'status' => $brief->admin_override_status,
                'note' => $brief->admin_override_note,
            ] : null,
            'reactions' => $this->reactions->stateForBrief($brief, $voterKey)->toArray(),
        ];
    }

    /** @return array{0: string, 1: string} [texto, fuente] */
    private function buildSummary(SurfConditionsSnapshotDto $snapshot, string $level, string $energyLabel): array
    {
        $currentMessage = $this->formatDayForAI($snapshot, $level, $energyLabel);

        try {
            $guide = $this->readGuide().$this->readLogisticsJsonBlock();
            $summary = $this->googleAI->generateReply($guide, [], $currentMessage);

            return [$this->sanitizePlainText($summary), SurfDailyBrief::SOURCE_GEMINI];
        } catch (GeminiUnavailableException $e) {
            Log::warning('SurfDailyBriefService: Gemini no disponible, usando plantilla de respaldo.', [
                'error' => $e->getMessage(),
            ]);

            return [$this->fallbackSummary($snapshot, $level), SurfDailyBrief::SOURCE_FALLBACK];
        }
    }

    private function readGuide(): string
    {
        $path = (string) config('services.zurriola_surf.guide_path');

        if ($path === '' || ! is_readable($path)) {
            throw new GeminiUnavailableException("Guía del spot no encontrada en: {$path}");
        }

        $contents = trim((string) file_get_contents($path));

        if ($contents === '') {
            throw new GeminiUnavailableException('Guía del spot vacía.');
        }

        return $contents;
    }

    /** JSON de reglas técnicas (viento por componente, energía kJ, marea, swell, periodo...). Opcional. */
    private function readLogisticsJsonBlock(): string
    {
        $path = (string) config('services.zurriola_surf.logistics_json_path');

        if ($path === '' || ! is_readable($path)) {
            return '';
        }

        $contents = trim((string) file_get_contents($path));

        if ($contents === '') {
            return '';
        }

        return "\n\n# Reglas técnicas estructuradas de Zurriola (JSON)\n\n".$contents;
    }

    /**
     * Construye el mensaje con el desglose mañana/tarde real de hoy (reutiliza
     * {@see SurfForecastTableService::todayDay()}, misma lógica que la tabla
     * pública). Si por lo que sea no se puede obtener esa serie horaria, cae
     * a un mensaje solo con el snapshot "ahora" (comportamiento anterior).
     */
    private function formatDayForAI(SurfConditionsSnapshotDto $snapshot, string $level, string $energyLabel): string
    {
        try {
            $day = $this->forecastTable->todayDay();
        } catch (Throwable $e) {
            Log::warning('SurfDailyBriefService: no se pudo obtener el desglose horario de hoy, uso solo el snapshot actual.', [
                'error' => $e->getMessage(),
            ]);

            return $this->formatSnapshotOnlyForAI($snapshot, $level, $energyLabel);
        }

        $morning = array_filter($day->slots, fn (SurfForecastSlotDto $slot) => (int) Carbon::parse($slot->time)->format('H') < 13);
        $afternoon = array_filter($day->slots, fn (SurfForecastSlotDto $slot) => (int) Carbon::parse($slot->time)->format('H') >= 13);

        $lines = ["Datos de hoy en Zurriola (franjas de la previsión horaria real):", ''];
        $lines[] = 'MAÑANA:';
        $lines = array_merge($lines, array_map($this->formatSlotForAI(...), $morning));
        $lines[] = '';
        $lines[] = 'TARDE:';
        $lines = array_merge($lines, array_map($this->formatSlotForAI(...), $afternoon));
        $lines[] = '';
        $lines[] = $this->formatTideEventsForAI($day);
        $lines[] = '';
        $lines[] = sprintf(
            'Snapshot ahora mismo: ola %.1f m/%.1f s dirección %d°, viento %.0f km/h dirección %d°, energía interna "%s", nivel recomendado por el sistema (orientativo): %s.',
            $snapshot->waveHeightM,
            $snapshot->wavePeriodS,
            $snapshot->waveDirectionDeg,
            $snapshot->windSpeedKmh,
            $snapshot->windDirectionDeg,
            $energyLabel,
            $level,
        );
        $lines[] = '';
        $lines[] = 'Redacta el parte del día explicando cómo estará por la mañana, cómo estará por la tarde, y qué franja horaria recomendarías según el nivel, siguiendo la guía y las reglas técnicas del spot.';

        return implode("\n", $lines);
    }

    private function formatSlotForAI(SurfForecastSlotDto $slot): string
    {
        $windKt = round($slot->windSpeedKmh / 1.852, 1);

        return sprintf(
            '- %s: ola %.1f m / %.1f s dirección %s, viento %.0f km/h (~%s nudos) dirección %s [%s], energía ~%d kJ (etiqueta interna "%s").',
            $slot->hourLabel,
            $slot->waveHeightM,
            $slot->wavePeriodS,
            CompassDirection::label($slot->waveDirectionDeg),
            $slot->windSpeedKmh,
            $windKt,
            CompassDirection::label($slot->windDirectionDeg),
            $slot->windState,
            $slot->energyKj,
            $slot->energyLabel,
        );
    }

    private function formatTideEventsForAI(SurfForecastDayDto $day): string
    {
        if ($day->tideEvents === []) {
            return 'Marea hoy: sin datos.';
        }

        $parts = array_map(
            fn ($event) => sprintf('%s %s (%.1fm)', $event->type === 'alta' ? 'Alta' : 'Baja', $event->hourLabel, $event->heightM),
            $day->tideEvents,
        );

        return 'Marea hoy (estimada): '.implode(' · ', $parts).'.';
    }

    private function formatSnapshotOnlyForAI(SurfConditionsSnapshotDto $snapshot, string $level, string $energyLabel): string
    {
        $swellLine = $snapshot->swellHeightM !== null
            ? sprintf('Swell: %.1f m, %.1f s, dirección %d°.', $snapshot->swellHeightM, $snapshot->swellPeriodS ?? 0.0, $snapshot->swellDirectionDeg ?? 0)
            : 'Swell: sin dato separado (usa la ola combinada).';

        return sprintf(
            "Datos de hoy en Zurriola:\nOla combinada: %.1f m, %.1f s, dirección %d°.\n%s\nViento: %.0f km/h, dirección %d°.\nÍndice de energía interno: %s.\nNivel recomendado por el sistema (orientativo): %s.\nRedacta el parte del día siguiendo la guía del spot.",
            $snapshot->waveHeightM,
            $snapshot->wavePeriodS,
            $snapshot->waveDirectionDeg,
            $swellLine,
            $snapshot->windSpeedKmh,
            $snapshot->windDirectionDeg,
            $energyLabel,
            $level,
        );
    }

    private function fallbackSummary(SurfConditionsSnapshotDto $snapshot, string $level): string
    {
        $levelLabel = $this->levelRecommender->label($level);

        return sprintf(
            'Hoy en Zurriola: olas de %.1f m (%.0f s), viento %.0f km/h. %s. Confirma siempre con la webcam antes de entrar al agua.',
            $snapshot->waveHeightM,
            $snapshot->wavePeriodS,
            $snapshot->windSpeedKmh,
            $levelLabel,
        );
    }

    private function persistTotalFailure(Carbon $date): SurfDailyBrief
    {
        return SurfDailyBrief::query()->updateOrCreate(
            ['report_date' => $date->toDateString()],
            [
                'ai_summary' => 'No hemos podido obtener el parte de hoy. Consulta la webcam en directo o pregúntanos por WhatsApp.',
                'summary_source' => SurfDailyBrief::SOURCE_FALLBACK,
                'generated_at' => Carbon::now(),
            ],
        );
    }

    private function compassLabel(?int $degrees): ?string
    {
        return \App\Support\CompassDirection::label($degrees);
    }

    /**
     * Red de seguridad por si Gemini ignora la instrucción de "sin markdown,
     * un solo párrafo": el texto se muestra como texto plano en la web, así
     * que quitamos negrita/títulos/listas y colapsamos saltos de línea.
     */
    private function sanitizePlainText(string $text): string
    {
        $text = preg_replace('/\*\*(.*?)\*\*/s', '$1', $text) ?? $text;
        $text = preg_replace('/__(.*?)__/s', '$1', $text) ?? $text;
        $text = preg_replace('/^#{1,6}\s*/m', '', $text) ?? $text;
        $text = preg_replace('/^[\-\*]\s+/m', '', $text) ?? $text;
        $text = preg_replace('/\s*\n+\s*/', ' ', $text) ?? $text;
        $text = preg_replace('/\s{2,}/', ' ', $text) ?? $text;

        return trim($text);
    }
}
