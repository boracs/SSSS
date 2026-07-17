<?php

declare(strict_types=1);

namespace App\Services\SurfConditions;

use App\DTOs\SurfConditions\SurfConditionsSnapshotDto;
use App\DTOs\SurfConditions\SurfHourlySeriesDto;
use App\Exceptions\SurfConditions\SurfConditionsUnavailableException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Cliente HTTP puro hacia Open-Meteo (oleaje + viento). Sin lógica de negocio:
 * solo pide los dos endpoints gratuitos y los mapea a {@see SurfConditionsSnapshotDto}.
 *
 * Dos llamadas porque Open-Meteo separa oleaje (`marine-api`) de viento
 * (`api` estándar); ambas gratuitas y sin API key.
 */
final class OpenMeteoMarineClient
{
    private const MARINE_ENDPOINT = 'https://marine-api.open-meteo.com/v1/marine';

    private const WEATHER_ENDPOINT = 'https://api.open-meteo.com/v1/forecast';

    private const TIMEOUT_SECONDS = 10;

    public function currentSnapshot(): SurfConditionsSnapshotDto
    {
        $latitude = (float) config('services.zurriola_surf.latitude');
        $longitude = (float) config('services.zurriola_surf.longitude');
        $timezone = (string) config('services.zurriola_surf.timezone', 'Europe/Madrid');

        $marine = $this->fetch(self::MARINE_ENDPOINT, [
            'latitude' => $latitude,
            'longitude' => $longitude,
            'hourly' => 'wave_height,wave_period,wave_direction,swell_wave_height,swell_wave_period,swell_wave_direction',
            'timezone' => $timezone,
            'forecast_days' => 1,
        ], 'Open-Meteo Marine');

        $weather = $this->fetch(self::WEATHER_ENDPOINT, [
            'latitude' => $latitude,
            'longitude' => $longitude,
            'hourly' => 'wind_speed_10m,wind_direction_10m',
            'timezone' => $timezone,
            'forecast_days' => 1,
        ], 'Open-Meteo Weather');

        $hourIndex = $this->currentHourIndex($marine['hourly']['time'] ?? [], $timezone);

        $waveHeight = $this->valueAt($marine, 'wave_height', $hourIndex);
        $wavePeriod = $this->valueAt($marine, 'wave_period', $hourIndex);
        $windSpeed = $this->valueAt($weather, 'wind_speed_10m', $hourIndex);
        $windDirection = $this->valueAt($weather, 'wind_direction_10m', $hourIndex);

        if ($waveHeight === null || $wavePeriod === null || $windSpeed === null || $windDirection === null) {
            throw new SurfConditionsUnavailableException(
                'Open-Meteo no devolvió datos válidos para el punto configurado de Zurriola (revisa latitude/longitude).'
            );
        }

        return new SurfConditionsSnapshotDto(
            waveHeightM: $waveHeight,
            wavePeriodS: $wavePeriod,
            waveDirectionDeg: (int) round($this->valueAt($marine, 'wave_direction', $hourIndex) ?? 0),
            swellHeightM: $this->valueAt($marine, 'swell_wave_height', $hourIndex),
            swellPeriodS: $this->valueAt($marine, 'swell_wave_period', $hourIndex),
            swellDirectionDeg: $this->intOrNull($this->valueAt($marine, 'swell_wave_direction', $hourIndex)),
            windSpeedKmh: $windSpeed,
            windDirectionDeg: (int) round($windDirection),
            fetchedAt: Carbon::now(),
        );
    }

    /**
     * Serie horaria completa (oleaje + swell + nivel del mar + viento) para
     * los próximos `$days` días. Usada por la tabla de previsión multi-día;
     * no toca `currentSnapshot()` (que sigue siendo el "ahora" del parte diario).
     */
    public function hourlySeries(int $days): SurfHourlySeriesDto
    {
        $latitude = (float) config('services.zurriola_surf.latitude');
        $longitude = (float) config('services.zurriola_surf.longitude');
        $timezone = (string) config('services.zurriola_surf.timezone', 'Europe/Madrid');

        $marine = $this->fetch(self::MARINE_ENDPOINT, [
            'latitude' => $latitude,
            'longitude' => $longitude,
            'hourly' => 'wave_height,wave_period,wave_direction,swell_wave_height,swell_wave_period,swell_wave_direction,sea_level_height_msl',
            'timezone' => $timezone,
            'forecast_days' => $days,
        ], 'Open-Meteo Marine');

        $weather = $this->fetch(self::WEATHER_ENDPOINT, [
            'latitude' => $latitude,
            'longitude' => $longitude,
            'hourly' => 'wind_speed_10m,wind_direction_10m',
            'timezone' => $timezone,
            'forecast_days' => $days,
        ], 'Open-Meteo Weather');

        $times = $marine['hourly']['time'] ?? [];

        if ($times === []) {
            throw new SurfConditionsUnavailableException(
                'Open-Meteo no devolvió serie horaria para el punto configurado de Zurriola.'
            );
        }

        $count = count($times);

        return new SurfHourlySeriesDto(
            times: $times,
            waveHeight: $this->floatSeries($marine, 'wave_height', $count),
            wavePeriod: $this->floatSeries($marine, 'wave_period', $count),
            waveDirection: $this->intSeries($marine, 'wave_direction', $count),
            swellHeight: $this->nullableFloatSeries($marine, 'swell_wave_height', $count),
            swellPeriod: $this->nullableFloatSeries($marine, 'swell_wave_period', $count),
            swellDirection: $this->nullableIntSeries($marine, 'swell_wave_direction', $count),
            windSpeed: $this->floatSeries($weather, 'wind_speed_10m', $count),
            windDirection: $this->intSeries($weather, 'wind_direction_10m', $count),
            seaLevel: $this->nullableFloatSeries($marine, 'sea_level_height_msl', $count),
        );
    }

    /** @return array<string, mixed> */
    private function fetch(string $url, array $query, string $label): array
    {
        try {
            $response = Http::timeout(self::TIMEOUT_SECONDS)->get($url, $query);
        } catch (Throwable $e) {
            Log::warning("OpenMeteoMarineClient: fallo de red hacia {$label}.", ['error' => $e->getMessage()]);

            throw new SurfConditionsUnavailableException("Fallo de red hacia {$label}: ".$e->getMessage(), previous: $e);
        }

        if ($response->failed()) {
            Log::warning("OpenMeteoMarineClient: {$label} respondió con error HTTP.", [
                'status' => $response->status(),
            ]);

            throw new SurfConditionsUnavailableException("{$label} HTTP {$response->status()}");
        }

        return $response->json() ?? [];
    }

    /** @param  list<string>  $times */
    private function currentHourIndex(array $times, string $timezone): int
    {
        $now = Carbon::now($timezone)->minute(0)->second(0)->format('Y-m-d\TH:i');

        foreach ($times as $index => $time) {
            if ($time === $now) {
                return $index;
            }
        }

        return 0;
    }

    private function valueAt(array $payload, string $variable, int $index): ?float
    {
        $value = $payload['hourly'][$variable][$index] ?? null;

        return is_numeric($value) ? (float) $value : null;
    }

    private function intOrNull(?float $value): ?int
    {
        return $value !== null ? (int) round($value) : null;
    }

    /** @return list<float> */
    private function floatSeries(array $payload, string $variable, int $count): array
    {
        $raw = $payload['hourly'][$variable] ?? [];

        return array_map(
            static fn (mixed $value): float => is_numeric($value) ? (float) $value : 0.0,
            array_pad(array_slice($raw, 0, $count), $count, 0.0)
        );
    }

    /** @return list<int> */
    private function intSeries(array $payload, string $variable, int $count): array
    {
        return array_map(
            static fn (float $value): int => (int) round($value),
            $this->floatSeries($payload, $variable, $count)
        );
    }

    /** @return list<float|null> */
    private function nullableFloatSeries(array $payload, string $variable, int $count): array
    {
        $raw = $payload['hourly'][$variable] ?? [];

        return array_map(
            static fn (mixed $value): ?float => is_numeric($value) ? (float) $value : null,
            array_pad(array_slice($raw, 0, $count), $count, null)
        );
    }

    /** @return list<int|null> */
    private function nullableIntSeries(array $payload, string $variable, int $count): array
    {
        return array_map(
            static fn (?float $value): ?int => $value !== null ? (int) round($value) : null,
            $this->nullableFloatSeries($payload, $variable, $count)
        );
    }
}
