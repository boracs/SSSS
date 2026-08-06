<?php

declare(strict_types=1);

namespace App\Services\SurfConditions;

use App\DTOs\SurfConditions\EuskalmetSeaDayDto;
use App\DTOs\SurfConditions\SurfTideEventDto;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use SimpleXMLElement;
use Throwable;

/**
 * Cliente de predicción marítima Euskalmet (Open Data Euskadi).
 *
 * Fuente pública sin API key:
 * {@see https://opendata.euskadi.eus/contenidos/prevision_maritima/sea_forecast/opendata/sea_forecast.xml}
 *
 * Cubre hoy / mañana / pasado con pleamar/bajamar a minutos. No sustituye la
 * serie horaria de Open-Meteo (franjas kJ / viento / dirección de ola).
 */
final class EuskalmetSeaForecastClient
{
    private const CACHE_KEY = 'surf_conditions.euskalmet_sea_forecast.v1';

    /**
     * Mareas de un día Y-m-d, o null si no hay forecast Euskalmet / error.
     *
     * @return array{events: list<SurfTideEventDto>, rise_m: float|null, fall_m: float|null}|null
     */
    public function tidesForDate(string $date): ?array
    {
        if (! (bool) config('services.euskalmet.enabled', true)) {
            return null;
        }

        $day = $this->dayByDate($date);
        if ($day === null || $day->tideEvents === []) {
            return null;
        }

        return [
            'events' => $day->tideEvents,
            'rise_m' => $day->tideRiseM,
            'fall_m' => $day->tideFallM,
        ];
    }

    public function dayByDate(string $date): ?EuskalmetSeaDayDto
    {
        foreach ($this->days() as $day) {
            if ($day->date === $date) {
                return $day;
            }
        }

        return null;
    }

    /** @return list<EuskalmetSeaDayDto> */
    public function days(): array
    {
        $ttl = max(60, (int) config('services.euskalmet.cache_ttl_seconds', 1800));

        try {
            /** @var list<EuskalmetSeaDayDto> $days */
            $days = Cache::remember(self::CACHE_KEY, $ttl, fn () => $this->fetchAndParse());
        } catch (Throwable $e) {
            Log::warning('EuskalmetSeaForecastClient: no se pudo cargar sea_forecast.', [
                'error' => $e->getMessage(),
            ]);

            return [];
        }

        return is_array($days) ? $days : [];
    }

    public function forget(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    /** @return list<EuskalmetSeaDayDto> */
    private function fetchAndParse(): array
    {
        $url = (string) config(
            'services.euskalmet.sea_forecast_xml_url',
            'https://opendata.euskadi.eus/contenidos/prevision_maritima/sea_forecast/opendata/sea_forecast.xml',
        );
        $timeout = max(3, (int) config('services.euskalmet.timeout_seconds', 10));

        $response = Http::timeout($timeout)
            ->accept('application/xml, text/xml, */*')
            ->get($url);

        if (! $response->successful()) {
            throw new \RuntimeException('Euskalmet sea_forecast HTTP '.$response->status());
        }

        $body = $response->body();
        if ($body === '') {
            throw new \RuntimeException('Euskalmet sea_forecast vacío.');
        }

        return $this->parseXml($body);
    }

    /** @return list<EuskalmetSeaDayDto> */
    public function parseXml(string $xml): array
    {
        $previous = libxml_use_internal_errors(true);
        try {
            $root = simplexml_load_string($xml);
        } finally {
            libxml_clear_errors();
            libxml_use_internal_errors($previous);
        }

        if (! $root instanceof SimpleXMLElement) {
            throw new \RuntimeException('Euskalmet sea_forecast XML inválido.');
        }

        $days = [];
        foreach ($root->xpath('//forecast') ?: [] as $forecast) {
            $day = $this->mapForecastNode($forecast);
            if ($day !== null) {
                $days[] = $day;
            }
        }

        return $days;
    }

    private function mapForecastNode(SimpleXMLElement $forecast): ?EuskalmetSeaDayDto
    {
        $periodDate = trim((string) ($forecast['periodDate'] ?? ''));
        $date = $this->normalizePeriodDate($periodDate);
        if ($date === null) {
            return null;
        }

        $rawEvents = [
            ['alta', (string) $forecast->firstHighTideTime, (string) $forecast->firstHighTide],
            ['baja', (string) $forecast->firstLowTideTime, (string) $forecast->firstLowTide],
            ['alta', (string) $forecast->secondHighTideTime, (string) $forecast->secondHighTide],
            ['baja', (string) $forecast->secondLowTideTime, (string) $forecast->secondLowTide],
        ];

        $events = [];
        foreach ($rawEvents as [$type, $timeRaw, $heightRaw]) {
            $clock = $this->extractClock($timeRaw);
            $height = $this->toFloat($heightRaw);
            if ($clock === null || $height === null) {
                continue;
            }

            $events[] = new SurfTideEventDto(
                type: $type,
                time: $date.'T'.$clock,
                hourLabel: $clock,
                heightM: round($height, 2),
                deltaM: null,
            );
        }

        usort(
            $events,
            static fn (SurfTideEventDto $a, SurfTideEventDto $b): int => strcmp($a->time, $b->time),
        );

        $events = $this->attachDeltas($events);
        [$rise, $fall] = $this->averageRiseFall($events);

        $textEs = trim((string) ($forecast->forecastDescription->es ?? ''));
        if ($textEs === '') {
            $textEs = null;
        }

        return new EuskalmetSeaDayDto(
            date: $date,
            tideEvents: $events,
            tideRiseM: $rise,
            tideFallM: $fall,
            waveHeightM: $this->toFloat((string) $forecast->waveHeight),
            forecastTextEs: $textEs,
            waterTemperature: $this->nullableTrim((string) $forecast->waterTemperature),
            visibility: $this->nullableTrim((string) $forecast->visibility),
        );
    }

    /**
     * @param  list<SurfTideEventDto>  $events
     * @return list<SurfTideEventDto>
     */
    private function attachDeltas(array $events): array
    {
        $withDelta = [];
        foreach ($events as $index => $event) {
            $delta = null;
            if ($index > 0) {
                $delta = round($event->heightM - $events[$index - 1]->heightM, 2);
            }
            $withDelta[] = new SurfTideEventDto(
                type: $event->type,
                time: $event->time,
                hourLabel: $event->hourLabel,
                heightM: $event->heightM,
                deltaM: $delta,
            );
        }

        return $withDelta;
    }

    /**
     * @param  list<SurfTideEventDto>  $events
     * @return array{0: float|null, 1: float|null}
     */
    private function averageRiseFall(array $events): array
    {
        $rises = [];
        $falls = [];
        foreach ($events as $event) {
            if ($event->deltaM === null) {
                continue;
            }
            if ($event->type === 'alta' && $event->deltaM > 0) {
                $rises[] = $event->deltaM;
            }
            if ($event->type === 'baja' && $event->deltaM < 0) {
                $falls[] = abs($event->deltaM);
            }
        }

        return [
            $rises !== [] ? round(array_sum($rises) / count($rises), 2) : null,
            $falls !== [] ? round(array_sum($falls) / count($falls), 2) : null,
        ];
    }

    private function normalizePeriodDate(string $periodDate): ?string
    {
        if (preg_match('/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/', $periodDate, $m) !== 1) {
            return null;
        }

        try {
            return Carbon::createFromDate((int) $m[3], (int) $m[2], (int) $m[1])
                ->format('Y-m-d');
        } catch (Throwable) {
            return null;
        }
    }

    private function extractClock(string $raw): ?string
    {
        if (preg_match('/\[(\d{1,2}):(\d{2}):(\d{2})\]/', $raw, $m) === 1) {
            return sprintf('%02d:%02d', (int) $m[1], (int) $m[2]);
        }

        if (preg_match('/\b(\d{1,2}):(\d{2})\b/', $raw, $m) === 1) {
            return sprintf('%02d:%02d', (int) $m[1], (int) $m[2]);
        }

        return null;
    }

    private function toFloat(string $raw): ?float
    {
        $raw = str_replace(',', '.', trim($raw));
        if ($raw === '' || ! is_numeric($raw)) {
            return null;
        }

        return (float) $raw;
    }

    private function nullableTrim(string $raw): ?string
    {
        $raw = trim($raw);

        return $raw !== '' ? $raw : null;
    }
}
