<?php

declare(strict_types=1);

namespace App\Services\SurfConditions;

use App\DTOs\SurfConditions\SurfConditionsSnapshotDto;
use App\DTOs\SurfConditions\SurfDetailedDayDto;
use App\DTOs\SurfConditions\SurfDetailedSlotDto;
use App\DTOs\SurfConditions\SurfForecastDayDto;
use App\DTOs\SurfConditions\SurfForecastSlotDto;
use App\DTOs\SurfConditions\SurfHourlySeriesDto;
use App\DTOs\SurfConditions\SurfLevelStarsDto;
use App\DTOs\SurfConditions\ZurriolaWeatherDayDto;
use App\DTOs\SurfConditions\ZurriolaWeatherHourDto;
use App\Models\SurfDailyBrief;
use App\Support\CompassDirection;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Construye la tabla de previsión de varios días (estilo Surfforecast):
 * oleaje/viento horario vía Open-Meteo; mareas preferentemente Euskalmet
 * (pleamar/bajamar oficiales) con fallback a extremos de sea_level Open-Meteo.
 *
 * Es un servicio DISTINTO de {@see SurfDailyBriefService}: aquel persiste en
 * BD el "parte de hoy" con texto de Gemini; este solo cachea una vista de
 * lectura (sin IA, sin override admin) porque es pura tabla de datos.
 * Estrellas: {@see SurfLevelQualityStarsService} (JSON del spot + umbrales).
 */
final class SurfForecastTableService
{
    /** Incluye versión para invalidar cachés antiguas al cambiar forecast_days / shape. */
    private const CACHE_KEY = 'surf_conditions.forecast_table.v16';

    private const CACHE_TTL_SECONDS = 3600;

    /** Slider "cada 2h · todos los días" (fusiona oleaje+tiempo); TTL corto porque depende del tiempo atmosférico. */
    private const CACHE_KEY_DETAILED = 'surf_conditions.detailed_timeline.v9';

    private const CACHE_TTL_DETAILED_SECONDS = 2700;

    public function __construct(
        private readonly OpenMeteoMarineClient $client,
        private readonly OpenMeteoWeatherClient $weatherClient,
        private readonly EuskalmetSeaForecastClient $euskalmet,
        private readonly SurfEnergyCalculator $energy,
        private readonly SurfWindStateClassifier $windState,
        private readonly TideExtremaCalculator $tides,
        private readonly SurfLevelRecommender $levelRecommender,
        private readonly SurfLevelQualityStarsService $qualityStars,
        private readonly ZurriolaSpotLogisticsService $logistics,
    ) {}

    /** @return array{days: list<array<string, mixed>>, metricHelp: array<string, string>} */
    public function publicPayload(): array
    {
        try {
            $days = Cache::remember(self::CACHE_KEY, self::CACHE_TTL_SECONDS, fn () => $this->build());
        } catch (Throwable $e) {
            Log::warning('SurfForecastTableService: no se pudo construir la tabla de previsión.', [
                'error' => $e->getMessage(),
            ]);

            return [
                'days' => [],
                'metricHelp' => $this->metricHelp(),
            ];
        }

        return [
            'days' => array_map($this->serializeDay(...), $days),
            'metricHelp' => $this->metricHelp(),
        ];
    }

    public function forget(): void
    {
        Cache::forget(self::CACHE_KEY);
        Cache::forget(self::CACHE_KEY_DETAILED);
        $this->euskalmet->forget();
    }

    /**
     * Slider "cada 2h · todos los días": fusiona TODOS los días de oleaje
     * (mismo cliente marine que la tabla compacta) con el tiempo atmosférico
     * de {@see OpenMeteoWeatherClient::fetchDetailedForecast()}, franja a
     * franja. Si el tiempo falla, se degrada a `weatherOk:false` pero el
     * oleaje se sirve igual (nunca se inventa tiempo, nunca se rompe la tabla
     * por un fallo ajeno).
     *
     * @return array{ok: bool, message?: string, weatherOk?: bool, weatherMessage?: ?string, days: list<array<string, mixed>>, metricHelp: array<string, string>}
     */
    public function detailedPayload(): array
    {
        try {
            $result = Cache::remember(
                self::CACHE_KEY_DETAILED,
                self::CACHE_TTL_DETAILED_SECONDS,
                fn () => $this->buildDetailed(),
            );
        } catch (Throwable $e) {
            Log::warning('SurfForecastTableService: no se pudo construir el slider detallado.', [
                'error' => $e->getMessage(),
            ]);

            return [
                'ok' => false,
                'message' => 'No se pudo cargar el detalle cada 2h. Inténtalo de nuevo en unos minutos.',
                'days' => [],
                'metricHelp' => $this->metricHelp(),
            ];
        }

        return [
            'ok' => true,
            'weatherOk' => $result['weatherOk'],
            'weatherMessage' => $result['weatherMessage'],
            'days' => array_map($this->serializeDetailedDay(...), $result['days']),
            'metricHelp' => $this->metricHelp(),
        ];
    }

    /** @return array{days: list<SurfDetailedDayDto>, weatherOk: bool, weatherMessage: ?string} */
    private function buildDetailed(): array
    {
        $daysAhead = (int) config('services.zurriola_surf.forecast_days', OpenMeteoMarineClient::MAX_FORECAST_DAYS);
        $daysAhead = max(1, min($daysAhead, OpenMeteoMarineClient::MAX_FORECAST_DAYS));
        $slotHours = (array) config('services.zurriola_surf.forecast_detailed_slot_hours', [6, 8, 10, 12, 14, 16, 18, 20, 22]);
        $timezone = (string) config('services.zurriola_surf.timezone', 'Europe/Madrid');

        $series = $this->client->hourlySeries($daysAhead);
        $weather = $this->fetchWeatherLookup($daysAhead);

        $dates = [];
        for ($i = 0; $i < $daysAhead; $i++) {
            $dates[] = Carbon::now($timezone)->addDays($i)->format('Y-m-d');
        }

        $days = array_map(
            fn (string $date) => $this->buildDetailedDay($series, $date, $slotHours, $weather['hourByTime'], $weather['dayByDate'][$date] ?? null),
            $dates,
        );

        // Mismo criterio que la tabla compacta: días sin ola/periodo reales (relleno null→0 de Open-Meteo) no se muestran.
        $days = array_values(array_filter(
            $days,
            fn (SurfDetailedDayDto $day) => $this->detailedDayHasUsableForceData($day)
        ));

        return [
            'days' => $days,
            'weatherOk' => $weather['ok'],
            'weatherMessage' => $weather['message'],
        ];
    }

    private function detailedDayHasUsableForceData(SurfDetailedDayDto $day): bool
    {
        foreach ($day->slots as $slot) {
            if ($slot->waveHeightM > 0.0 && $slot->wavePeriodS > 0.0) {
                return true;
            }
        }

        return false;
    }

    /**
     * @return array{hourByTime: array<string, ZurriolaWeatherHourDto>, dayByDate: array<string, ZurriolaWeatherDayDto>, ok: bool, message: ?string}
     */
    private function fetchWeatherLookup(int $days): array
    {
        if (! (bool) config('services.zurriola_surf.weather_detail_enabled', true)) {
            return ['hourByTime' => [], 'dayByDate' => [], 'ok' => false, 'message' => 'El tiempo detallado no está disponible ahora mismo.'];
        }

        try {
            $forecast = $this->weatherClient->fetchDetailedForecast($days);
        } catch (Throwable $e) {
            Log::warning('SurfForecastTableService: no se pudo fusionar el tiempo atmosférico en el slider detallado.', [
                'error' => $e->getMessage(),
            ]);

            return ['hourByTime' => [], 'dayByDate' => [], 'ok' => false, 'message' => 'No se pudo cargar el tiempo atmosférico; se muestra solo el oleaje.'];
        }

        $hourByTime = [];
        foreach ($forecast->hourly as $hour) {
            $hourByTime[$hour->time] = $hour;
        }

        $dayByDate = [];
        foreach ($forecast->daily as $day) {
            $dayByDate[$day->date] = $day;
        }

        return ['hourByTime' => $hourByTime, 'dayByDate' => $dayByDate, 'ok' => true, 'message' => null];
    }

    /**
     * @param  list<int>  $slotHours
     * @param  array<string, ZurriolaWeatherHourDto>  $weatherHourByTime
     */
    private function buildDetailedDay(
        SurfHourlySeriesDto $series,
        string $date,
        array $slotHours,
        array $weatherHourByTime,
        ?ZurriolaWeatherDayDto $weatherDay,
    ): SurfDetailedDayDto {
        $tide = $this->resolveTides($series, $date);
        $slots = [];

        foreach ($series->times as $index => $time) {
            if (! str_starts_with($time, $date)) {
                continue;
            }

            $hour = (int) Carbon::parse($time)->format('H');
            if (! in_array($hour, $slotHours, true)) {
                continue;
            }

            $slots[] = $this->buildDetailedSlot(
                $series,
                $index,
                $time,
                $weatherHourByTime[$time] ?? null,
                $tide['events'],
            );
        }

        return new SurfDetailedDayDto(
            date: $date,
            dayLabel: Carbon::parse($date)->locale('es')->isoFormat('dddd D MMM'),
            slots: $slots,
            tideEvents: $tide['events'],
            tideRiseM: $tide['rise_m'],
            tideFallM: $tide['fall_m'],
            tempMaxC: $weatherDay?->tempMaxC,
            tempMinC: $weatherDay?->tempMinC,
            sunrise: $weatherDay?->sunrise,
            sunset: $weatherDay?->sunset,
        );
    }

    private function buildDetailedSlot(
        SurfHourlySeriesDto $series,
        int $index,
        string $time,
        ?ZurriolaWeatherHourDto $weatherHour,
        array $tideEvents = [],
    ): SurfDetailedSlotDto {
        $waveHeight = $series->waveHeight[$index];
        $wavePeriod = $series->wavePeriod[$index];
        $windSpeed = $series->windSpeed[$index];
        $windDirection = $series->windDirection[$index];

        [$energyHeight, $energyPeriod] = $this->energy->resolveHeightPeriod(
            $waveHeight,
            $wavePeriod,
            $series->swellHeight[$index],
            $series->swellPeriod[$index],
        );
        $energyIndex = $this->energy->indexForValues($energyHeight, $energyPeriod);

        $signal = $this->levelRecommender->recommendSignal(new SurfConditionsSnapshotDto(
            waveHeightM: $waveHeight,
            wavePeriodS: $wavePeriod,
            waveDirectionDeg: $series->waveDirection[$index],
            swellHeightM: $series->swellHeight[$index],
            swellPeriodS: $series->swellPeriod[$index],
            swellDirectionDeg: $series->swellDirection[$index],
            windSpeedKmh: $windSpeed,
            windDirectionDeg: $windDirection,
            fetchedAt: Carbon::parse($time),
        ));

        $windState = $this->windState->classify($windSpeed, $windDirection);
        $energyKj = $this->energy->energyKj($energyHeight, $energyPeriod);
        $stars = $this->qualityStars->forSlot(
            energyKj: $energyKj,
            waveHeightM: $waveHeight,
            wavePeriodS: $wavePeriod,
            windState: $windState,
            windSpeedKmh: $windSpeed,
            signal: $signal,
            at: Carbon::parse($time),
            tidePhase: $this->qualityStars->tidePhaseAt(Carbon::parse($time), $tideEvents),
            windDirectionDeg: $windDirection,
        );

        return new SurfDetailedSlotDto(
            time: $time,
            hourLabel: Carbon::parse($time)->format('H:i'),
            waveHeightM: round($waveHeight, 2),
            wavePeriodS: round($wavePeriod, 1),
            waveDirectionDeg: $series->waveDirection[$index],
            windSpeedKmh: round($windSpeed, 1),
            windDirectionDeg: $windDirection,
            energyIndex: $energyIndex,
            energyLabel: $this->energy->labelFor($energyIndex),
            energyKj: $energyKj,
            windState: $windState,
            signal: $signal,
            qualityStars: $stars->intermedio,
            qualityStarsIniciacion: $stars->iniciacion,
            qualityStarsIntermedio: $stars->intermedio,
            qualityStarsAvanzado: $stars->avanzado,
            weatherCode: $weatherHour?->weatherCode,
            tempC: $weatherHour?->temperatureC,
            precipProbabilityPct: $weatherHour?->precipProbabilityPct,
        );
    }

    /** @return array<string, mixed> */
    private function serializeDetailedDay(SurfDetailedDayDto $day): array
    {
        return [
            'date' => $day->date,
            'dayLabel' => $day->dayLabel,
            'tempMaxC' => $day->tempMaxC,
            'tempMinC' => $day->tempMinC,
            'sunrise' => $day->sunrise,
            'sunset' => $day->sunset,
            'slots' => array_map(fn (SurfDetailedSlotDto $slot) => [
                'time' => $slot->time,
                'hourLabel' => $slot->hourLabel,
                'waveHeightM' => $slot->waveHeightM,
                'wavePeriodS' => $slot->wavePeriodS,
                'waveDirectionDeg' => $slot->waveDirectionDeg,
                'waveDirectionLabel' => CompassDirection::label($slot->waveDirectionDeg),
                'windSpeedKmh' => $slot->windSpeedKmh,
                'windDirectionDeg' => $slot->windDirectionDeg,
                'windDirectionLabel' => CompassDirection::label($slot->windDirectionDeg),
                'energyIndex' => $slot->energyIndex,
                'energyLabel' => $slot->energyLabel,
                'energyKj' => $slot->energyKj,
                'energyTone' => $this->energyTone($slot->energyKj),
                'windState' => $slot->windState,
                'windStateLabel' => $this->windState->label($slot->windState),
                'windTone' => $this->windTone($slot->windSpeedKmh),
                'signal' => $slot->signal,
                'qualityStars' => $slot->qualityStars,
                'qualityStarsIniciacion' => $slot->qualityStarsIniciacion,
                'qualityStarsIntermedio' => $slot->qualityStarsIntermedio,
                'qualityStarsAvanzado' => $slot->qualityStarsAvanzado,
                'weatherCode' => $slot->weatherCode,
                'tempC' => $slot->tempC,
                'precipProbabilityPct' => $slot->precipProbabilityPct,
            ], $day->slots),
            'tideEvents' => array_map(fn ($event) => [
                'type' => $event->type,
                'hourLabel' => $event->hourLabel,
                'heightM' => $event->heightM,
                'deltaM' => $event->deltaM,
            ], $day->tideEvents),
            'tideRiseM' => $day->tideRiseM,
            'tideFallM' => $day->tideFallM,
        ];
    }

    /**
     * Franjas horarias de HOY (mismo cálculo que la tabla pública: energía,
     * estado del viento, marea) sin pasar por la caché de la tabla multi-día.
     * Usado por {@see \App\Services\SurfConditions\SurfDailyBriefService} para
     * dar a Gemini el desglose mañana/tarde real, sin duplicar esta lógica.
     */
    public function todayDay(): SurfForecastDayDto
    {
        return $this->build(1)[0];
    }

    /** @return list<SurfForecastDayDto> */
    private function build(?int $daysAhead = null): array
    {
        $daysAhead ??= (int) config('services.zurriola_surf.forecast_days', OpenMeteoMarineClient::MAX_FORECAST_DAYS);
        $daysAhead = max(1, min($daysAhead, OpenMeteoMarineClient::MAX_FORECAST_DAYS));
        $slotHours = (array) config('services.zurriola_surf.forecast_slot_hours', [6, 9, 12, 15, 18, 21]);
        $timezone = (string) config('services.zurriola_surf.timezone', 'Europe/Madrid');

        $series = $this->client->hourlySeries($daysAhead);

        $dates = [];
        for ($i = 0; $i < $daysAhead; $i++) {
            $dates[] = Carbon::now($timezone)->addDays($i)->format('Y-m-d');
        }

        $days = array_map(fn (string $date) => $this->buildDay($series, $date, $slotHours), $dates);

        // Open-Meteo a menudo rellena días lejanos con null (aquí → 0): sin ola/periodo
        // la "fuerza" no es fiable. No mostrar esos días en la tabla pública.
        // todayDay() pide 1 día y no filtra (el brief necesita la franja de hoy).
        if ($daysAhead <= 1) {
            return $days;
        }

        return array_values(array_filter(
            $days,
            fn (SurfForecastDayDto $day) => $this->dayHasUsableForceData($day)
        ));
    }

    /**
     * Día usable si alguna franja diurna tiene altura y periodo de ola > 0.
     * (null de API se serializa como 0; un día real "plano" en Zurriola suele
     * seguir trayendo Hs ~0.4–0.6 m, no todo a cero.)
     */
    private function dayHasUsableForceData(SurfForecastDayDto $day): bool
    {
        foreach ($day->slots as $slot) {
            if ($slot->waveHeightM > 0.0 && $slot->wavePeriodS > 0.0) {
                return true;
            }
        }

        return false;
    }

    /** @param  list<int>  $slotHours */
    private function buildDay(SurfHourlySeriesDto $series, string $date, array $slotHours): SurfForecastDayDto
    {
        $tide = $this->resolveTides($series, $date);
        $slots = [];

        foreach ($series->times as $index => $time) {
            if (! str_starts_with($time, $date)) {
                continue;
            }

            $hour = (int) Carbon::parse($time)->format('H');
            if (! in_array($hour, $slotHours, true)) {
                continue;
            }

            $slots[] = $this->buildSlot($series, $index, $time);
        }

        $best = $this->pickBestSlot($slots, $tide['events']);

        return new SurfForecastDayDto(
            date: $date,
            dayLabel: Carbon::parse($date)->locale('es')->isoFormat('dddd D MMM'),
            slots: $slots,
            tideEvents: $tide['events'],
            tideRiseM: $tide['rise_m'],
            tideFallM: $tide['fall_m'],
            bestSignal: $best['signal'],
            qualityStars: $best['starsIntermedio'],
            qualityStarsIniciacion: $best['starsIniciacion'],
            qualityStarsIntermedio: $best['starsIntermedio'],
            qualityStarsAvanzado: $best['starsAvanzado'],
            bestSlotTime: $best['time'],
        );
    }

    /**
     * Slot con más estrellas intermedio del día; en empate, el más temprano.
     * Las tres puntuaciones se calculan para ese mismo "mejor momento".
     *
     * @param  list<SurfForecastSlotDto>  $slots
     * @param  list<\App\DTOs\SurfConditions\SurfTideEventDto>  $tideEvents
     * @return array{signal: string, time: ?string, starsIniciacion: int, starsIntermedio: int, starsAvanzado: int}
     */
    private function pickBestSlot(array $slots, array $tideEvents = []): array
    {
        if ($slots === []) {
            return [
                'signal' => SurfDailyBrief::OVERRIDE_CLOSED,
                'time' => null,
                'starsIniciacion' => 1,
                'starsIntermedio' => 1,
                'starsAvanzado' => 1,
            ];
        }

        $best = null;
        foreach ($slots as $slot) {
            $stars = $this->starsForSlot($slot, $tideEvents);
            if ($best === null || $stars->intermedio > $best['starsIntermedio']) {
                $best = [
                    'starsIniciacion' => $stars->iniciacion,
                    'starsIntermedio' => $stars->intermedio,
                    'starsAvanzado' => $stars->avanzado,
                    'signal' => $slot->signal,
                    'time' => $slot->time,
                ];
            }
        }

        return $best;
    }

    private function starsForSlot(SurfForecastSlotDto $slot, array $tideEvents = []): SurfLevelStarsDto
    {
        $at = Carbon::parse($slot->time);

        return $this->qualityStars->forSlot(
            energyKj: $slot->energyKj,
            waveHeightM: $slot->waveHeightM,
            wavePeriodS: $slot->wavePeriodS,
            windState: $slot->windState,
            windSpeedKmh: $slot->windSpeedKmh,
            signal: $slot->signal,
            at: $at,
            tidePhase: $this->qualityStars->tidePhaseAt($at, $tideEvents),
            windDirectionDeg: $slot->windDirectionDeg,
        );
    }

    /**
     * Preferir Euskalmet (minutos reales, costa vasca). Si falta el día o falla
     * la fuente, estimar extremos desde la curva horaria Open-Meteo.
     *
     * @return array{events: list<\App\DTOs\SurfConditions\SurfTideEventDto>, rise_m: float|null, fall_m: float|null}
     */
    private function resolveTides(SurfHourlySeriesDto $series, string $date): array
    {
        $euskalmet = $this->euskalmet->tidesForDate($date);
        if ($euskalmet !== null && $euskalmet['events'] !== []) {
            return $euskalmet;
        }

        return $this->tides->extremaForDate($series->times, $series->seaLevel, $date);
    }

    private function buildSlot(SurfHourlySeriesDto $series, int $index, string $time): SurfForecastSlotDto
    {
        $waveHeight = $series->waveHeight[$index];
        $wavePeriod = $series->wavePeriod[$index];
        $windSpeed = $series->windSpeed[$index];
        $windDirection = $series->windDirection[$index];

        [$energyHeight, $energyPeriod] = $this->energy->resolveHeightPeriod(
            $waveHeight,
            $wavePeriod,
            $series->swellHeight[$index],
            $series->swellPeriod[$index],
        );
        $energyIndex = $this->energy->indexForValues($energyHeight, $energyPeriod);

        $signal = $this->levelRecommender->recommendSignal(new SurfConditionsSnapshotDto(
            waveHeightM: $waveHeight,
            wavePeriodS: $wavePeriod,
            waveDirectionDeg: $series->waveDirection[$index],
            swellHeightM: $series->swellHeight[$index],
            swellPeriodS: $series->swellPeriod[$index],
            swellDirectionDeg: $series->swellDirection[$index],
            windSpeedKmh: $windSpeed,
            windDirectionDeg: $windDirection,
            fetchedAt: Carbon::parse($time),
        ));

        return new SurfForecastSlotDto(
            time: $time,
            hourLabel: Carbon::parse($time)->format('H:i'),
            waveHeightM: round($waveHeight, 2),
            wavePeriodS: round($wavePeriod, 1),
            waveDirectionDeg: $series->waveDirection[$index],
            swellHeightM: $series->swellHeight[$index] !== null ? round($series->swellHeight[$index], 2) : null,
            swellPeriodS: $series->swellPeriod[$index] !== null ? round($series->swellPeriod[$index], 1) : null,
            swellDirectionDeg: $series->swellDirection[$index],
            windSpeedKmh: round($windSpeed, 1),
            windDirectionDeg: $windDirection,
            energyIndex: $energyIndex,
            energyLabel: $this->energy->labelFor($energyIndex),
            energyKj: $this->energy->energyKj($energyHeight, $energyPeriod),
            windState: $this->windState->classify($windSpeed, $windDirection),
            signal: $signal,
        );
    }

    /** @return array<string, mixed> */
    private function serializeDay(SurfForecastDayDto $day): array
    {
        return [
            'date' => $day->date,
            'dayLabel' => $day->dayLabel,
            'slots' => array_map(fn (SurfForecastSlotDto $slot) => [
                'time' => $slot->time,
                'hourLabel' => $slot->hourLabel,
                'waveHeightM' => $slot->waveHeightM,
                'wavePeriodS' => $slot->wavePeriodS,
                'waveDirectionDeg' => $slot->waveDirectionDeg,
                'waveDirectionLabel' => CompassDirection::label($slot->waveDirectionDeg),
                'swellHeightM' => $slot->swellHeightM,
                'swellPeriodS' => $slot->swellPeriodS,
                'swellDirectionDeg' => $slot->swellDirectionDeg,
                'swellDirectionLabel' => CompassDirection::label($slot->swellDirectionDeg),
                'windSpeedKmh' => $slot->windSpeedKmh,
                'windDirectionDeg' => $slot->windDirectionDeg,
                'windDirectionLabel' => CompassDirection::label($slot->windDirectionDeg),
                'energyIndex' => $slot->energyIndex,
                'energyLabel' => $slot->energyLabel,
                'energyKj' => $slot->energyKj,
                'energyTone' => $this->energyTone($slot->energyKj),
                'windState' => $slot->windState,
                'windStateLabel' => $this->windState->label($slot->windState),
                'windTone' => $this->windTone($slot->windSpeedKmh),
                'signal' => $slot->signal,
            ], $day->slots),
            'tideEvents' => array_map(fn ($event) => [
                'type' => $event->type,
                'hourLabel' => $event->hourLabel,
                'heightM' => $event->heightM,
                'deltaM' => $event->deltaM,
            ], $day->tideEvents),
            'tideRiseM' => $day->tideRiseM,
            'tideFallM' => $day->tideFallM,
            'bestSignal' => $day->bestSignal,
            'qualityStars' => $day->qualityStars,
            'qualityStarsIniciacion' => $day->qualityStarsIniciacion,
            'qualityStarsIntermedio' => $day->qualityStarsIntermedio,
            'qualityStarsAvanzado' => $day->qualityStarsAvanzado,
            'bestSlotTime' => $day->bestSlotTime,
        ];
    }

    private function windTone(float $windSpeedKmh): string
    {
        $bands = (array) config('services.zurriola_surf.forecast_wind_color_kmh', []);
        $greenMax = (float) ($bands['green_max'] ?? 9);
        $yellowMax = (float) ($bands['yellow_max'] ?? 19);

        return match (true) {
            $windSpeedKmh <= $greenMax => 'green',
            $windSpeedKmh <= $yellowMax => 'yellow',
            default => 'red',
        };
    }

    private function energyTone(int $energyKj): string
    {
        $kj = max(0, $energyKj);
        $config = (array) config('services.zurriola_surf.forecast_energy_color_kj', []);
        $bands = $config['bands'] ?? null;

        if (is_array($bands) && $bands !== []) {
            foreach ($bands as $band) {
                if (! is_array($band)) {
                    continue;
                }
                $max = (int) ($band['max'] ?? PHP_INT_MAX);
                $tone = (string) ($band['tone'] ?? '');
                if ($tone !== '' && $kj <= $max) {
                    return $tone;
                }
            }

            $last = end($bands);
            if (is_array($last) && isset($last['tone']) && is_string($last['tone']) && $last['tone'] !== '') {
                return $last['tone'];
            }
        }

        // Fallback legacy (green_max / yellow_max) por si un entorno aún no tiene bands.
        $greenMax = (int) ($config['green_max'] ?? 400);
        $yellowMax = (int) ($config['yellow_max'] ?? 800);

        return match (true) {
            $kj <= $greenMax => 'e6',
            $kj <= $yellowMax => 'e8',
            default => 'e13',
        };
    }

    /**
     * Textos cortos de ayuda para los iconos (i) de la tabla. Vienen del JSON
     * de logística (`ui_metric_help`) — editables sin tocar código.
     *
     * @return array<string, string>
     */
    private function metricHelp(): array
    {
        return $this->logistics->metricHelp();
    }
}
