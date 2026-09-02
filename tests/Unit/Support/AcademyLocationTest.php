<?php

declare(strict_types=1);

namespace Tests\Unit\Support;

use App\Support\AcademyLocation;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class AcademyLocationTest extends TestCase
{
    #[Test]
    public function nap_is_the_shop_not_the_zurriola_marine_point(): void
    {
        $loc = AcademyLocation::forFrontend();

        $this->assertSame('Paseo Colón 41 bajo', $loc['street']);
        $this->assertSame('20002', $loc['postalCode']);
        $this->assertSame('B26739128', $loc['cif']);
        $this->assertStringContainsString('S.L.', $loc['legalName']);
        $this->assertArrayNotHasKey('iban', $loc);
        $this->assertStringContainsString('google.com/maps/search', $loc['googleMapsUrl']);
        $this->assertStringContainsString('41', rawurldecode(parse_url($loc['googleMapsUrl'], PHP_URL_QUERY) ?? ''));
        $this->assertNotEquals(
            (float) config('services.zurriola_surf.longitude'),
            $loc['longitude'],
        );
    }

    #[Test]
    public function placeholder_maps_url_is_ignored(): void
    {
        config(['services.academy.maps_url' => 'https://maps.app.goo.gl/TuUbicacion']);

        $this->assertStringContainsString('google.com/maps/search', AcademyLocation::mapsUrl());
        $this->assertStringNotContainsString('TuUbicacion', AcademyLocation::mapsUrl());
    }
}
