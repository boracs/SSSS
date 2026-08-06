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
        private readonly EuskalmetSeaForecastClient $euskalmet,
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

        [$summary, $source, $sections] = $this->buildSummary($snapshot, $level, $energyLabel);

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
                'ai_summary_sections' => $sections,
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
            $this->ensureGenerationQueued();

            return [
                'has_data' => false,
                'status' => 'generating',
                'message' => 'Estamos generando el parte de hoy… Vuelve a cargar en unos segundos.',
            ];
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
            'status' => 'ready',
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
            'summary_sections' => $this->publicSummarySections($brief),
            'summary_source' => $brief->summary_source,
            'generated_at' => $brief->generated_at?->toIso8601String(),
            'generated_at_human' => $brief->generated_at?->locale('es')->translatedFormat('d/m/Y H:i'),
            'signal' => $this->buildSignalPayload($brief),
            'override' => $brief->hasOverride() ? [
                'status' => $brief->admin_override_status,
                'note' => $brief->admin_override_note,
            ] : null,
            'reactions' => $this->reactions->stateForBrief($brief, $voterKey)->toArray(),
        ];
    }

    /**
     * Badge único de 4 colores: automático por oleaje/viento, o el que fije el admin.
     *
     * @return array{status: string, auto_status: string, is_manual: bool, note: ?string}
     */
    private function buildSignalPayload(SurfDailyBrief $brief): array
    {
        $auto = $this->levelRecommender->autoSignalFromBrief($brief);
        $isManual = $brief->hasOverride()
            && in_array($brief->admin_override_status, SurfDailyBrief::OVERRIDE_STATUSES, true);

        return [
            'status' => $isManual ? (string) $brief->admin_override_status : $auto,
            'auto_status' => $auto,
            'is_manual' => $isManual,
            'note' => $brief->admin_override_note,
        ];
    }

    /**
     * Si no hay parte de hoy (o está pending), programa UNA generación tras enviar
     * la respuesta HTTP — no bloquea la request ni llama APIs en el ciclo Inertia.
     * El cron cada 6 h sigue siendo la vía principal en producción.
     */
    private function ensureGenerationQueued(): void
    {
        $today = Carbon::today();
        $date = $today->toDateString();
        $lockKey = self::CACHE_PREFIX.'gen:'.$date;

        $existing = SurfDailyBrief::query()->where('report_date', $date)->first();

        // Si el pending lleva >5 min atascado, permitir otro intento.
        if (
            $existing !== null
            && $existing->summary_source === SurfDailyBrief::SOURCE_PENDING
            && $existing->updated_at !== null
            && $existing->updated_at->lt(Carbon::now()->subMinutes(5))
        ) {
            Cache::forget($lockKey);
        }

        if (! Cache::add($lockKey, 1, 90)) {
            return;
        }

        if ($existing === null) {
            SurfDailyBrief::query()->create([
                'report_date' => $date,
                'summary_source' => SurfDailyBrief::SOURCE_PENDING,
                'ai_summary' => null,
            ]);
            $this->forget($today);
        }

        dispatch(function (): void {
            try {
                app(self::class)->generateForToday(force: false);
            } catch (Throwable $e) {
                Log::error('SurfDailyBriefService: generación diferida falló.', [
                    'error' => $e->getMessage(),
                ]);
            }
        })->afterResponse();
    }

    /**
     * @return array{0: string, 1: string, 2: array{general: string, iniciacion: ?string, intermedio: ?string, avanzado: ?string, aviso: ?string}}
     */
    private function buildSummary(SurfConditionsSnapshotDto $snapshot, string $level, string $energyLabel): array
    {
        $currentMessage = $this->formatDayForAI($snapshot, $level, $energyLabel);

        try {
            $guide = $this->readGuide().$this->readLogisticsJsonBlock();
            // El parte devuelve un JSON con 5 campos (general + 3 niveles + aviso); 350 tokens (el
            // default pensado para respuestas cortas del chatbot) se queda corto y trunca el JSON.
            $raw = $this->googleAI->generateReply($guide, [], $currentMessage, maxOutputTokens: 900);
            $sections = $this->parseStructuredSummary($raw);

            return [$sections['general'], SurfDailyBrief::SOURCE_GEMINI, $sections];
        } catch (GeminiUnavailableException $e) {
            Log::warning('SurfDailyBriefService: Gemini no disponible, usando plantilla de respaldo.', [
                'error' => $e->getMessage(),
            ]);

            $sections = $this->fallbackSections($snapshot, $level);

            return [$sections['general'], SurfDailyBrief::SOURCE_FALLBACK, $sections];
        }
    }

    /**
     * @return array{general: string, iniciacion: ?string, intermedio: ?string, avanzado: ?string, aviso: ?string}
     */
    private function parseStructuredSummary(string $raw): array
    {
        $trimmed = trim($raw);
        $trimmed = preg_replace('/^```(?:json)?\s*/i', '', $trimmed) ?? $trimmed;
        $trimmed = preg_replace('/\s*```$/', '', $trimmed) ?? $trimmed;
        $trimmed = trim($trimmed);

        $decoded = json_decode($trimmed, true);

        // Red de seguridad: si Gemini antepuso texto/fences extra o el objeto quedó rodeado de
        // basura (p. ej. una respuesta "meta" que envuelve el JSON esperado), nos quedamos con el
        // primer '{' hasta el último '}' y reintentamos antes de rendirnos al texto plano.
        if (! is_array($decoded)) {
            $start = strpos($trimmed, '{');
            $end = strrpos($trimmed, '}');
            if ($start !== false && $end !== false && $end > $start) {
                $decoded = json_decode(substr($trimmed, $start, $end - $start + 1), true);
            }
        }

        if (! is_array($decoded)) {
            $plain = $this->sanitizePlainText($raw);

            return [
                'general' => $plain !== '' ? $plain : 'Parte no disponible.',
                'iniciacion' => null,
                'intermedio' => null,
                'avanzado' => null,
                'aviso' => null,
            ];
        }

        $general = $this->sanitizePlainText((string) ($decoded['general'] ?? ''));
        if ($general === '') {
            $general = $this->sanitizePlainText($raw);
        }

        $avisoRaw = $decoded['aviso'] ?? null;
        $aviso = null;
        if (is_string($avisoRaw) && trim($avisoRaw) !== '' && strtolower(trim($avisoRaw)) !== 'null') {
            $aviso = $this->sanitizePlainText($avisoRaw);
        }

        return [
            'general' => $general !== '' ? $general : 'Parte no disponible.',
            'iniciacion' => $this->nullableSanitizedField($decoded['iniciacion'] ?? null),
            'intermedio' => $this->nullableSanitizedField($decoded['intermedio'] ?? null),
            'avanzado' => $this->nullableSanitizedField($decoded['avanzado'] ?? null),
            'aviso' => $aviso,
        ];
    }

    private function nullableSanitizedField(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }
        $clean = $this->sanitizePlainText($value);

        return $clean !== '' ? $clean : null;
    }

    /**
     * @return array{general: ?string, iniciacion: ?string, intermedio: ?string, avanzado: ?string, aviso: ?string}|null
     */
    private function publicSummarySections(SurfDailyBrief $brief): ?array
    {
        $sections = $brief->ai_summary_sections;
        if (! is_array($sections)) {
            return null;
        }

        $general = isset($sections['general']) && is_string($sections['general'])
            ? trim($sections['general'])
            : null;
        $iniciacion = isset($sections['iniciacion']) && is_string($sections['iniciacion'])
            ? trim($sections['iniciacion'])
            : null;
        $intermedio = isset($sections['intermedio']) && is_string($sections['intermedio'])
            ? trim($sections['intermedio'])
            : null;
        $avanzado = isset($sections['avanzado']) && is_string($sections['avanzado'])
            ? trim($sections['avanzado'])
            : null;
        $aviso = isset($sections['aviso']) && is_string($sections['aviso'])
            ? trim($sections['aviso'])
            : null;

        if ($iniciacion === null && $intermedio === null && $avanzado === null) {
            return null;
        }

        return [
            'general' => $general !== '' ? $general : $brief->ai_summary,
            'iniciacion' => $iniciacion !== '' ? $iniciacion : null,
            'intermedio' => $intermedio !== '' ? $intermedio : null,
            'avanzado' => $avanzado !== '' ? $avanzado : null,
            'aviso' => $aviso !== '' ? $aviso : null,
        ];
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
        $euskalmetDay = $this->euskalmet->dayByDate($day->date);
        if ($euskalmetDay?->forecastTextEs) {
            $lines[] = 'Parte marítimo Euskalmet (costa vasca): '.$euskalmetDay->forecastTextEs;
            if ($euskalmetDay->waveHeightM !== null) {
                $lines[] = sprintf('Altura de ola diaria Euskalmet (orientativa): %.1f m.', $euskalmetDay->waveHeightM);
            }
            if ($euskalmetDay->waterTemperature !== null) {
                $lines[] = 'Temperatura del agua Euskalmet: '.$euskalmetDay->waterTemperature.' °C.';
            }
        }
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
        $lines[] = 'Redacta el parte del día en el JSON obligatorio de la guía (general + iniciacion + intermedio + avanzado + aviso), con los kJ reales de cada franja y las reglas técnicas del spot.';

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

        return 'Marea hoy (Euskalmet / Open Data Euskadi; fallback Open-Meteo): '.implode(' · ', $parts).'.';
    }

    private function formatSnapshotOnlyForAI(SurfConditionsSnapshotDto $snapshot, string $level, string $energyLabel): string
    {
        $swellLine = $snapshot->swellHeightM !== null
            ? sprintf('Swell: %.1f m, %.1f s, dirección %d°.', $snapshot->swellHeightM, $snapshot->swellPeriodS ?? 0.0, $snapshot->swellDirectionDeg ?? 0)
            : 'Swell: sin dato separado (usa la ola combinada).';

        return sprintf(
            "Datos de hoy en Zurriola:\nOla combinada: %.1f m, %.1f s, dirección %d°.\n%s\nViento: %.0f km/h, dirección %d°.\nÍndice de energía interno: %s.\nNivel recomendado por el sistema (orientativo): %s.\nRedacta el parte del día en el JSON obligatorio de la guía.",
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

    /**
     * @return array{general: string, iniciacion: string, intermedio: string, avanzado: string, aviso: null}
     */
    private function fallbackSections(SurfConditionsSnapshotDto $snapshot, string $level): array
    {
        $levelLabel = $this->levelRecommender->label($level);
        $general = sprintf(
            'Hoy en Zurriola: olas de %.1f m (%.0f s), viento %.0f km/h. Confirma siempre con la webcam antes de entrar al agua.',
            $snapshot->waveHeightM,
            $snapshot->wavePeriodS,
            $snapshot->windSpeedKmh,
        );

        return [
            'general' => $general,
            'iniciacion' => 'Condiciones orientativas para iniciación: '.$levelLabel.'.',
            'intermedio' => 'Condiciones orientativas para intermedio: '.$levelLabel.'.',
            'avanzado' => 'Condiciones orientativas para avanzado: '.$levelLabel.'.',
            'aviso' => null,
        ];
    }

    private function fallbackSummary(SurfConditionsSnapshotDto $snapshot, string $level): string
    {
        return $this->fallbackSections($snapshot, $level)['general'];
    }

    private function persistTotalFailure(Carbon $date): SurfDailyBrief
    {
        return SurfDailyBrief::query()->updateOrCreate(
            ['report_date' => $date->toDateString()],
            [
                'ai_summary' => 'No hemos podido obtener el parte de hoy. Consulta la webcam en directo o pregúntanos por WhatsApp.',
                'ai_summary_sections' => [
                    'general' => 'No hemos podido obtener el parte de hoy. Consulta la webcam en directo o pregúntanos por WhatsApp.',
                    'iniciacion' => null,
                    'intermedio' => null,
                    'avanzado' => null,
                    'aviso' => null,
                ],
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
