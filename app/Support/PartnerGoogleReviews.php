<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * Reseñas públicas del partner operativo (The Bunker) para CRO en home/contacto.
 * Rating/conteo manual; fragmentos desde JSON curado (opiniones públicas en Google).
 */
final class PartnerGoogleReviews
{
    private const SNIPPETS_CACHE_PREFIX = 'partner.google_reviews.snippets.v1';

    private const SNIPPETS_CACHE_TTL = 3600;

    /** @return array<string, mixed>|null */
    public static function forFrontend(): ?array
    {
        $config = config('services.partner_google_reviews', []);

        if (! filter_var($config['active'] ?? false, FILTER_VALIDATE_BOOLEAN)) {
            return null;
        }

        $reviewsUrl = trim((string) ($config['reviews_url'] ?? ''));
        if ($reviewsUrl === '') {
            return null;
        }

        $rating = (float) ($config['rating'] ?? 0);
        $reviewCount = (int) ($config['review_count'] ?? 0);

        if ($rating <= 0 || $reviewCount <= 0) {
            return null;
        }

        return [
            'businessName' => (string) ($config['business_name'] ?? 'The Bunker Surf Shop'),
            'legalName' => (string) ($config['legal_name'] ?? ''),
            'rating' => round($rating, 1),
            'reviewCount' => max(0, $reviewCount),
            'reviewsUrl' => $reviewsUrl,
            'partnerNote' => (string) ($config['partner_note'] ?? ''),
            'snippetsDisclaimer' => (string) ($config['snippets_disclaimer'] ?? ''),
            'snippets' => self::loadSnippets($config),
        ];
    }

    /**
     * @param  array<string, mixed>  $config
     * @return list<array<string, mixed>>
     */
    private static function loadSnippets(array $config): array
    {
        $path = (string) ($config['snippets_json_path'] ?? resource_path('partner/bunker-google-reviews.json'));

        if (! is_readable($path)) {
            Log::warning('Partner Google reviews JSON no legible', ['path' => $path]);

            return [];
        }

        $cacheKey = self::SNIPPETS_CACHE_PREFIX.'.'.(int) filemtime($path);

        return Cache::remember(
            $cacheKey,
            self::SNIPPETS_CACHE_TTL,
            static function () use ($path): array {
                /** @var array<string, mixed>|null $raw */
                $raw = json_decode((string) file_get_contents($path), true);
                if (! is_array($raw) || ! is_array($raw['snippets'] ?? null)) {
                    Log::warning('Partner Google reviews JSON inválido', ['path' => $path]);

                    return [];
                }

                $out = [];
                foreach ($raw['snippets'] as $row) {
                    if (! is_array($row)) {
                        continue;
                    }

                    $quote = trim((string) ($row['quote'] ?? ''));
                    if ($quote === '') {
                        continue;
                    }

                    $out[] = [
                        'id' => (string) ($row['id'] ?? md5($quote)),
                        'quote' => $quote,
                        'author' => trim((string) ($row['author'] ?? 'Cliente · Google')),
                        'rating' => min(5, max(1, (int) ($row['rating'] ?? 5))),
                        'context' => trim((string) ($row['context'] ?? '')),
                    ];
                }

                return $out;
            },
        );
    }
}
