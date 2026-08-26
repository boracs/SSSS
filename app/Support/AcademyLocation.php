<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Ubicación pública NAP + enlaces Google Maps (Zurriola).
 * Coordenadas alineadas con JSON-LD LocalBusiness en PublicPageSeoService.
 */
final class AcademyLocation
{
    /** @return array<string, mixed> */
    public static function forFrontend(): array
    {
        $lat = (float) config('services.zurriola_surf.latitude', 43.325);
        $lon = (float) config('services.zurriola_surf.longitude', -1.975);

        return [
            'name' => 'San Sebastian Surf School',
            'street' => 'Playa de Zurriola',
            'locality' => 'Donostia-San Sebastián',
            'region' => 'Gipuzkoa',
            'postalCode' => '20001',
            'country' => 'ES',
            'label' => 'Playa de Zurriola · Donostia-San Sebastián',
            'note' => 'A pie de playa, a unos 20 m de la arena.',
            'latitude' => $lat,
            'longitude' => $lon,
            'googleMapsUrl' => self::googleMapsUrl($lat, $lon),
            'googleMapsEmbedUrl' => self::googleMapsEmbedUrl($lat, $lon),
        ];
    }

    private static function googleMapsUrl(float $lat, float $lon): string
    {
        $query = rawurlencode(sprintf('%f,%f', $lat, $lon));

        return 'https://www.google.com/maps/search/?api=1&query='.$query;
    }

    private static function googleMapsEmbedUrl(float $lat, float $lon): string
    {
        $query = rawurlencode(sprintf('%f,%f', $lat, $lon));

        return 'https://maps.google.com/maps?q='.$query.'&z=16&output=embed';
    }
}
