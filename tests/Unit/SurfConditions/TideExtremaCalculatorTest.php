<?php

declare(strict_types=1);

namespace Tests\Unit\SurfConditions;

use App\Services\SurfConditions\TideExtremaCalculator;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class TideExtremaCalculatorTest extends TestCase
{
    #[Test]
    public function refines_high_tide_away_from_exact_hour_when_neighbors_are_asymmetric(): void
    {
        $calc = new TideExtremaCalculator();

        // Pico discreto a las 08:00, pero la subida es más larga que la bajada → extremo un poco antes.
        $times = [
            '2026-08-04T06:00',
            '2026-08-04T07:00',
            '2026-08-04T08:00',
            '2026-08-04T09:00',
            '2026-08-04T10:00',
        ];
        $heights = [0.5, 1.2, 1.8, 1.5, 0.9];

        $result = $calc->extremaForDate($times, $heights, '2026-08-04');
        $altas = array_values(array_filter(
            $result['events'],
            static fn ($event): bool => $event->type === 'alta',
        ));

        $this->assertCount(1, $altas);
        $this->assertNotSame('08:00', $altas[0]->hourLabel);
        $this->assertMatchesRegularExpression('/^0[78]:\d{2}$/', $altas[0]->hourLabel);
    }
}
