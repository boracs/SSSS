<?php

declare(strict_types=1);

namespace App\Services\SurfConditions;

use App\DTOs\SurfConditions\SurfForecastDayDto;
use App\DTOs\SurfConditions\SurfForecastSlotDto;
use App\DTOs\SurfConditions\SurfHourlySeriesDto;
use App\Support\CompassDirection;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Construye la tabla de previsión de varios días (estilo Surfforecast) a
 * partir de la serie horaria cruda de Open-Meteo: agrupa por día, filtra a
 * las franjas diurnas configuradas y calcula energía/estado del viento por
 * franja + picos de marea estimados por día.
 *
 * Es un servicio DISTINTO de {@see SurfDailyBriefService}: aquel persiste en
 * BD el "parte de hoy" con texto de Gemini; este solo cachea una vista de
 * lectura (sin IA, sin override admin) porque es pura tabla de datos.
 */
final class SurfForecastTableService
{
    private const CACHE_KEY = 'surf_conditions.forecast_table';

    private const CACHE_TTL_SECONDS = 3600;

    public function __construct(
        private readonly OpenMeteoMarineClient $client,
        private readonly SurfEnergyCalculator $energy,
        private readonly SurfWindStateClassifier $windState,
        private readonly TideExtremaCalculator $tides,
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
    }

    /**
     * Franjas horarias de HOY (mismo cálculo que la tabla pública: energía,
     * estado del viento, marea) sin pasar por la caché de la tabla de 3 días.
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
        $daysAhead ??= (int) config('services.zurriola_surf.forecast_days', 3);
        $slotHours = (array) config('services.zurriola_surf.forecast_slot_hours', [6, 9, 12, 15, 18, 21]);
        $timezone = (string) config('services.zurriola_surf.timezone', 'Europe/Madrid');

        $series = $this->client->hourlySeries($daysAhead);

        $dates = [];
        for ($i = 0; $i < $daysAhead; $i++) {
            $dates[] = Carbon::now($timezone)->addDays($i)->format('Y-m-d');
        }

        return array_map(fn (string $date) => $this->buildDay($series, $date, $slotHours), $dates);
    }

    /** @param  list<int>  $slotHours */
    private function buildDay(SurfHourlySeriesDto $series, string $date, array $slotHours): SurfForecastDayDto
    {
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

        $tide = $this->tides->extremaForDate($series->times, $series->seaLevel, $date);

        return new SurfForecastDayDto(
            date: $date,
            dayLabel: Carbon::parse($date)->locale('es')->isoFormat('dddd D MMM'),
            slots: $slots,
            tideEvents: $tide['events'],
            tideRiseM: $tide['rise_m'],
            tideFallM: $tide['fall_m'],
        );
    }

    private function buildSlot(SurfHourlySeriesDto $series, int $index, string $time): SurfForecastSlotDto
    {
        $waveHeight = $series->waveHeight[$index];
        $wavePeriod = $series->wavePeriod[$index];
        $windSpeed = $series->windSpeed[$index];
        $windDirection = $series->windDirection[$index];

        $energyHeight = $series->swellHeight[$index] ?? $waveHeight;
        $energyPeriod = $series->swellPeriod[$index] ?? $wavePeriod;
        $energyIndex = $this->energy->indexForValues($energyHeight, $energyPeriod);

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
        $bands = (array) config('services.zurriola_surf.forecast_energy_color_kj', []);
        $greenMax = (int) ($bands['green_max'] ?? 400);
        $yellowMax = (int) ($bands['yellow_max'] ?? 800);

        return match (true) {
            $energyKj <= $greenMax => 'green',
            $energyKj <= $yellowMax => 'yellow',
            default => 'red',
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
        $path = (string) config('services.zurriola_surf.logistics_json_path');
        if ($path === '' || ! is_readable($path)) {
            return [];
        }

        $decoded = json_decode((string) file_get_contents($path), true);
        if (! is_array($decoded)) {
            return [];
        }

        $help = $decoded['ui_metric_help'] ?? [];

        return is_array($help)
            ? array_map(static fn (mixed $text): string => (string) $text, $help)
            : [];
    }
}
