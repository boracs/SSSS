<?php

declare(strict_types=1);

namespace App\Services\SurfConditions;

use App\DTOs\SurfConditions\ZurriolaWeatherDayDto;
use App\DTOs\SurfConditions\ZurriolaWeatherForecastDto;
use App\DTOs\SurfConditions\ZurriolaWeatherHourDto;
use App\Exceptions\SurfConditions\SurfConditionsUnavailableException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Cliente HTTP puro hacia Open-Meteo `api/forecast` para variables
 * atmosféricas (temperatura, precipitación, nubosidad, viento, UV) usadas
 * SOLO por el panel "Tiempo detallado" bajo demanda en webcams.
 *
 * No sustituye a {@see OpenMeteoMarineClient} (oleaje/viento de la tabla de
 * previsión): mismo proveedor, endpoint distinto, sin lógica de negocio aquí.
 */
final class OpenMeteoWeatherClient
{
    private const ENDPOINT = 'https://api.open-meteo.com/v1/forecast';

    private const TIMEOUT_SECONDS = 10;

    private const FORECAST_DAYS = 7;

    /** Tope de franjas horarias devueltas al front (24h por defecto + "Ver 48 h"). */
    private const MAX_HOURLY_POINTS = 48;

    public function fetchForecast(): ZurriolaWeatherForecastDto
    {
        $timezone = (string) config('services.zurriola_surf.timezone', 'Europe/Madrid');
        $payload = $this->fetchPayload(self::FORECAST_DAYS);

        return new ZurriolaWeatherForecastDto(
            fetchedAt: Carbon::now($timezone)->toIso8601String(),
            hourly: $this->buildHourly($payload, $timezone),
            daily: $this->buildDaily($payload),
        );
    }

    /**
     * Variante para el slider "cada 2h · todos los días" ({@see \App\Services\SurfConditions\SurfForecastTableService::detailedPayload()}):
     * misma llamada a Open-Meteo pero para `$days` (hasta 16, igual que
     * {@see OpenMeteoMarineClient}) y SIN recortar desde "ahora" ni limitar
     * a {@see self::MAX_HOURLY_POINTS} — el servicio que fusiona necesita la
     * rejilla horaria completa desde las 00:00 para cuadrar con el oleaje.
     */
    public function fetchDetailedForecast(int $days): ZurriolaWeatherForecastDto
    {
        $timezone = (string) config('services.zurriola_surf.timezone', 'Europe/Madrid');
        $payload = $this->fetchPayload($days);

        return new ZurriolaWeatherForecastDto(
            fetchedAt: Carbon::now($timezone)->toIso8601String(),
            hourly: $this->buildHourlyAll($payload),
            daily: $this->buildDaily($payload),
        );
    }

    /** @return array<string, mixed> */
    private function fetchPayload(int $days): array
    {
        $latitude = (float) config('services.zurriola_surf.latitude');
        $longitude = (float) config('services.zurriola_surf.longitude');
        $timezone = (string) config('services.zurriola_surf.timezone', 'Europe/Madrid');

        return $this->fetch([
            'latitude' => $latitude,
            'longitude' => $longitude,
            'hourly' => 'temperature_2m,precipitation_probability,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index,weather_code',
            'daily' => 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,weather_code',
            'timezone' => $timezone,
            'forecast_days' => max(1, min($days, 16)),
            'wind_speed_unit' => 'kmh',
        ]);
    }

    /** @return array<string, mixed> */
    private function fetch(array $query): array
    {
        try {
            $response = Http::timeout(self::TIMEOUT_SECONDS)->get(self::ENDPOINT, $query);
        } catch (Throwable $e) {
            Log::warning('Zurriola weather detail fetch failed', ['error' => $e->getMessage()]);

            throw new SurfConditionsUnavailableException('Fallo de red hacia Open-Meteo Weather: '.$e->getMessage(), previous: $e);
        }

        if ($response->failed()) {
            Log::warning('Zurriola weather detail fetch failed', ['error' => "HTTP {$response->status()}"]);

            throw new SurfConditionsUnavailableException("Open-Meteo Weather HTTP {$response->status()}");
        }

        return $response->json() ?? [];
    }

    /**
     * Recorta la serie horaria cruda a partir de la hora actual (TZ negocio)
     * y la limita a {@see self::MAX_HOURLY_POINTS} entradas.
     *
     * @param  array<string, mixed>  $payload
     * @return list<ZurriolaWeatherHourDto>
     */
    private function buildHourly(array $payload, string $timezone): array
    {
        $times = $payload['hourly']['time'] ?? [];

        if ($times === []) {
            throw new SurfConditionsUnavailableException('Open-Meteo no devolvió serie horaria de tiempo atmosférico.');
        }

        $nowKey = Carbon::now($timezone)->minute(0)->second(0)->format('Y-m-d\TH:i');

        $startIndex = 0;
        foreach ($times as $index => $time) {
            if ($time >= $nowKey) {
                $startIndex = $index;
                break;
            }
        }

        $hours = [];
        $count = count($times);
        for ($i = $startIndex; $i < $count && count($hours) < self::MAX_HOURLY_POINTS; $i++) {
            $hours[] = new ZurriolaWeatherHourDto(
                time: (string) $times[$i],
                temperatureC: $this->floatAt($payload, 'hourly', 'temperature_2m', $i),
                precipProbabilityPct: $this->intAt($payload, 'hourly', 'precipitation_probability', $i),
                cloudCoverPct: $this->intAt($payload, 'hourly', 'cloud_cover', $i),
                windSpeedKmh: $this->floatAt($payload, 'hourly', 'wind_speed_10m', $i),
                windDirectionDeg: $this->intAt($payload, 'hourly', 'wind_direction_10m', $i),
                windGustsKmh: $this->floatAt($payload, 'hourly', 'wind_gusts_10m', $i),
                uvIndex: $this->intAt($payload, 'hourly', 'uv_index', $i),
                weatherCode: $this->intAt($payload, 'hourly', 'weather_code', $i),
            );
        }

        return $hours;
    }

    /**
     * Serie horaria COMPLETA (sin recorte desde "ahora" ni tope de puntos),
     * para el slider "cada 2h · todos los días" (ver {@see fetchDetailedForecast()}).
     *
     * @param  array<string, mixed>  $payload
     * @return list<ZurriolaWeatherHourDto>
     */
    private function buildHourlyAll(array $payload): array
    {
        $times = $payload['hourly']['time'] ?? [];

        if ($times === []) {
            throw new SurfConditionsUnavailableException('Open-Meteo no devolvió serie horaria de tiempo atmosférico.');
        }

        $hours = [];
        foreach (array_keys($times) as $i) {
            $hours[] = new ZurriolaWeatherHourDto(
                time: (string) $times[$i],
                temperatureC: $this->floatAt($payload, 'hourly', 'temperature_2m', $i),
                precipProbabilityPct: $this->intAt($payload, 'hourly', 'precipitation_probability', $i),
                cloudCoverPct: $this->intAt($payload, 'hourly', 'cloud_cover', $i),
                windSpeedKmh: $this->floatAt($payload, 'hourly', 'wind_speed_10m', $i),
                windDirectionDeg: $this->intAt($payload, 'hourly', 'wind_direction_10m', $i),
                windGustsKmh: $this->floatAt($payload, 'hourly', 'wind_gusts_10m', $i),
                uvIndex: $this->intAt($payload, 'hourly', 'uv_index', $i),
                weatherCode: $this->intAt($payload, 'hourly', 'weather_code', $i),
            );
        }

        return $hours;
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return list<ZurriolaWeatherDayDto>
     */
    private function buildDaily(array $payload): array
    {
        $dates = $payload['daily']['time'] ?? [];

        if ($dates === []) {
            throw new SurfConditionsUnavailableException('Open-Meteo no devolvió resumen diario de tiempo atmosférico.');
        }

        $days = [];
        foreach (array_keys($dates) as $i) {
            $days[] = new ZurriolaWeatherDayDto(
                date: (string) $dates[$i],
                tempMaxC: $this->floatAt($payload, 'daily', 'temperature_2m_max', $i),
                tempMinC: $this->floatAt($payload, 'daily', 'temperature_2m_min', $i),
                precipProbabilityMaxPct: $this->intAt($payload, 'daily', 'precipitation_probability_max', $i),
                sunrise: (string) ($payload['daily']['sunrise'][$i] ?? ''),
                sunset: (string) ($payload['daily']['sunset'][$i] ?? ''),
                weatherCode: $this->intAt($payload, 'daily', 'weather_code', $i),
            );
        }

        return $days;
    }

    /** @param  array<string, mixed>  $payload */
    private function floatAt(array $payload, string $group, string $variable, int $index): float
    {
        $value = $payload[$group][$variable][$index] ?? null;

        return is_numeric($value) ? (float) $value : 0.0;
    }

    /** @param  array<string, mixed>  $payload */
    private function intAt(array $payload, string $group, string $variable, int $index): int
    {
        $value = $payload[$group][$variable][$index] ?? null;

        return is_numeric($value) ? (int) round((float) $value) : 0;
    }
}
