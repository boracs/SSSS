<?php

declare(strict_types=1);

namespace App\Support;

/**
 * NAP público de la sede (Paseo Colón 41) + URLs Google Maps.
 * Independiente de {@see config('services.zurriola_surf')} (parte/webcam).
 * JSON-LD LocalBusiness reutiliza {@see forFrontend()}.
 */
final class AcademyLocation
{
    private const PLACEHOLDER_MAPS_NEEDLE = 'TuUbicacion';

    /** @return array<string, mixed> */
    public static function forFrontend(): array
    {
        $lat = self::latitude();
        $lon = self::longitude();
        $street = self::street();
        $postalCode = self::postalCode();
        $locality = self::locality();
        $region = self::region();
        $legalName = self::legalName();
        $cif = self::cif();

        return [
            'name' => 'San Sebastián Surf School',
            'legalName' => $legalName,
            'cif' => $cif,
            'street' => $street,
            'locality' => $locality,
            'region' => $region,
            'postalCode' => $postalCode,
            'country' => 'ES',
            'label' => $street.' · Donostia',
            'note' => self::meetingNote(),
            'legalLine' => $legalName.' · CIF '.$cif.' · '.$street.', '.$postalCode.' '.$locality,
            'latitude' => $lat,
            'longitude' => $lon,
            'googleMapsUrl' => self::mapsUrl(),
            'googleMapsEmbedUrl' => self::embedUrl(),
        ];
    }

    public static function legalName(): string
    {
        return trim((string) config('services.academy.legal_name', 'San Sebastian Surf School S.L.'));
    }

    public static function cif(): string
    {
        return trim((string) config('services.academy.cif', 'B26739128'));
    }

    public static function street(): string
    {
        return trim((string) config('services.academy.street', 'Paseo Colón 41 bajo'));
    }

    public static function locality(): string
    {
        return trim((string) config('services.academy.locality', 'Donostia-San Sebastián'));
    }

    public static function region(): string
    {
        return trim((string) config('services.academy.region', 'Gipuzkoa'));
    }

    public static function postalCode(): string
    {
        return trim((string) config('services.academy.postal_code', '20002'));
    }

    public static function latitude(): float
    {
        return (float) config('services.academy.latitude', 43.325412);
    }

    public static function longitude(): float
    {
        return (float) config('services.academy.longitude', -1.974047);
    }

    public static function mapsQuery(): string
    {
        return trim((string) config(
            'services.academy.maps_query',
            'Paseo Colón 41 bajo, 20002 Donostia-San Sebastián',
        ));
    }

    public static function meetingNote(): string
    {
        return trim((string) config(
            'services.academy.meeting_note',
            'El mapa marca el local. El día de clase, el punto de encuentro es la playa de Zurriola.',
        ));
    }

    /**
     * Enlace público a Google Maps (sede). Ignora el placeholder histórico TuUbicacion.
     */
    public static function mapsUrl(): string
    {
        $configured = trim((string) config('services.academy.maps_url', ''));
        if ($configured !== '' && ! str_contains($configured, self::PLACEHOLDER_MAPS_NEEDLE)) {
            return $configured;
        }

        return 'https://www.google.com/maps/search/?api=1&query='.rawurlencode(self::mapsQuery());
    }

    public static function embedUrl(): string
    {
        return 'https://maps.google.com/maps?q='.rawurlencode(self::mapsQuery()).'&z=17&output=embed';
    }
}
