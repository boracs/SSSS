<?php

declare(strict_types=1);

namespace App\Services\SurfConditions;

use App\DTOs\SurfConditions\ZurriolaGeoFactsDto;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Carga hechos GEO públicos de Zurriola (JSON editable).
 * Sin APIs externas; usado en webcams + FAQ JSON-LD.
 */
final class ZurriolaGeoFactsService
{
    public function publicPayload(): array
    {
        return $this->dto()->toArray();
    }

    public function dto(): ZurriolaGeoFactsDto
    {
        $path = (string) config(
            'services.zurriola_surf.geo_facts_json_path',
            resource_path('surf-guide/zurriola-geo-facts.json'),
        );

        if (! is_readable($path)) {
            Log::warning('Zurriola GEO facts JSON no legible', ['path' => $path]);
            throw new RuntimeException('Zurriola GEO facts file missing: '.$path);
        }

        /** @var array<string, mixed>|null $raw */
        $raw = json_decode((string) file_get_contents($path), true);
        if (! is_array($raw)) {
            throw new RuntimeException('Zurriola GEO facts JSON inválido: '.$path);
        }

        $place = is_array($raw['place'] ?? null) ? $raw['place'] : [];
        $school = is_array($raw['school_to_beach'] ?? null) ? $raw['school_to_beach'] : [];
        $operations = is_array($raw['operations'] ?? null) ? $raw['operations'] : [];
        $material = is_array($raw['material'] ?? null) ? $raw['material'] : [];

        return new ZurriolaGeoFactsDto(
            description: (string) ($raw['description'] ?? ''),
            beachName: (string) ($place['beach_name'] ?? 'Playa de la Zurriola'),
            locality: (string) ($place['locality'] ?? 'Donostia / San Sebastián'),
            orientationLabel: (string) ($place['orientation_label'] ?? 'NW'),
            breakType: (string) ($place['break_type'] ?? 'Beach break de arena'),
            breakNote: (string) ($place['break_note'] ?? ''),
            schoolToBeachMeters: (int) ($school['meters'] ?? 20),
            schoolToBeachLabel: (string) ($school['label'] ?? 'A pie de playa.'),
            consistencyNote: (string) ($raw['consistency_note'] ?? ''),
            seasons: $this->listOfMaps($raw['seasons'] ?? []),
            summerWindows: $this->listOfMaps($raw['summer_windows'] ?? []),
            levelsIntro: (string) ($raw['levels_intro'] ?? ''),
            energyBands: $this->listOfMaps($raw['energy_bands'] ?? []),
            arriveMinutesBefore: (int) ($operations['arrive_minutes_before'] ?? 15),
            operationsText: (string) ($operations['text'] ?? ''),
            materialIncluded: $this->stringList($material['included'] ?? []),
            materialBring: $this->stringList($material['bring'] ?? []),
            materialText: (string) ($material['text'] ?? ''),
            cancellationPolicy: isset($raw['cancellation_policy']) && is_string($raw['cancellation_policy'])
                ? $raw['cancellation_policy']
                : null,
            faqs: $this->listOfMaps($raw['faqs'] ?? []),
            disclaimer: (string) ($raw['disclaimer'] ?? ''),
        );
    }

    /**
     * Nodos FAQPage para JSON-LD (solo preguntas con respuesta no vacía).
     *
     * @return list<array<string, mixed>>
     */
    public function faqJsonLdNodes(string $pageUrl): array
    {
        $faqs = array_values(array_filter(
            $this->dto()->faqs,
            static fn (array $f): bool => trim((string) ($f['question'] ?? '')) !== ''
                && trim((string) ($f['answer'] ?? '')) !== '',
        ));

        if ($faqs === []) {
            return [];
        }

        return [[
            '@context' => 'https://schema.org',
            '@type' => 'FAQPage',
            'url' => $pageUrl,
            'mainEntity' => array_map(static fn (array $f): array => [
                '@type' => 'Question',
                'name' => (string) $f['question'],
                'acceptedAnswer' => [
                    '@type' => 'Answer',
                    'text' => (string) $f['answer'],
                ],
            ], $faqs),
        ]];
    }

    /**
     * @param  mixed  $value
     * @return list<array<string, mixed>>
     */
    private function listOfMaps(mixed $value): array
    {
        if (! is_array($value)) {
            return [];
        }

        $out = [];
        foreach ($value as $row) {
            if (is_array($row)) {
                $out[] = $row;
            }
        }

        return $out;
    }

    /**
     * @param  mixed  $value
     * @return list<string>
     */
    private function stringList(mixed $value): array
    {
        if (! is_array($value)) {
            return [];
        }

        $out = [];
        foreach ($value as $item) {
            if (is_string($item) && trim($item) !== '') {
                $out[] = $item;
            }
        }

        return $out;
    }
}
