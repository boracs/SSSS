<?php

declare(strict_types=1);

namespace App\Services\SurfConditions;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Orquesta el panel "Tiempo detallado" de `/servicios/webcams`: cachea el
 * forecast de {@see OpenMeteoWeatherClient} 45 min (fetch on-demand desde el
 * front, nunca en la carga inicial de la página) y degrada a `ok:false` sin
 * romper la respuesta si Open-Meteo falla.
 */
final class ZurriolaWeatherForecastService
{
    private const CACHE_KEY = 'zurriola.weather.forecast.v2';

    private const CACHE_TTL_MINUTES = 45;

    public function __construct(
        private readonly OpenMeteoWeatherClient $client,
    ) {}

    /** @return array<string, mixed> */
    public function publicPayload(): array
    {
        if (! (bool) config('services.zurriola_surf.weather_detail_enabled', true)) {
            return [
                'ok' => false,
                'message' => 'El tiempo detallado no está disponible ahora mismo.',
            ];
        }

        try {
            $forecast = Cache::remember(
                self::CACHE_KEY,
                now()->addMinutes(self::CACHE_TTL_MINUTES),
                fn () => $this->client->fetchForecast(),
            );
        } catch (Throwable $e) {
            Log::warning('Zurriola weather detail fetch failed', [
                'error' => $e->getMessage(),
            ]);

            return [
                'ok' => false,
                'message' => 'No se pudo cargar el tiempo detallado. Inténtalo de nuevo en unos minutos.',
            ];
        }

        return ['ok' => true] + $forecast->toArray();
    }

    public function forget(): void
    {
        Cache::forget(self::CACHE_KEY);
    }
}
