<?php

declare(strict_types=1);

namespace Tests\Unit\SurfConditions;

use App\Services\SurfConditions\SurfEnergyCalculator;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class SurfEnergyCalculatorTest extends TestCase
{
    #[Test]
    public function matches_surf_forecast_kj_when_height_and_period_match_sf_short_period(): void
    {
        config([
            'services.zurriola_surf.energy_kj_calibration_factor' => 2.4,
            'services.zurriola_surf.energy_kj_height_scale' => 1.0, // H ya es el de SF
            'services.zurriola_surf.energy_kj_period_boost_max' => 1.6,
        ]);

        $calc = new SurfEnergyCalculator();

        // Ref diag: SF 2.1 m / 6 s → 341 kJ (±1 por redondeo ft)
        $this->assertEqualsWithDelta(341, $calc->energyKj(2.1, 6.0), 1.0);
    }

    #[Test]
    public function open_meteo_height_scale_aligns_saturday_slot_toward_sf(): void
    {
        config([
            'services.zurriola_surf.energy_kj_calibration_factor' => 2.4,
            'services.zurriola_surf.energy_kj_height_scale' => 1.52,
            'services.zurriola_surf.energy_kj_period_boost_max' => 1.6,
        ]);

        $calc = new SurfEnergyCalculator();

        // OM sáb 15:00 ~1.38 m / 5.5 s; SF ~2.1 m / 6 s / 341
        $kj = $calc->energyKj(1.38, 5.5);
        $this->assertGreaterThanOrEqual(300, $kj);
        $this->assertLessThanOrEqual(360, $kj);
    }

    #[Test]
    public function long_period_boost_raises_monday_slot_toward_sf(): void
    {
        config([
            'services.zurriola_surf.energy_kj_calibration_factor' => 2.4,
            'services.zurriola_surf.energy_kj_height_scale' => 1.52,
            'services.zurriola_surf.energy_kj_period_boost_max' => 1.6,
        ]);

        $calc = new SurfEnergyCalculator();

        // OM lun 15:00 ~1.26 m / 8.1 s; SF ~1.6 m / 10 s / 527
        $kj = $calc->energyKj(1.26, 8.1);
        $this->assertGreaterThanOrEqual(450, $kj);
        $this->assertLessThanOrEqual(560, $kj);
    }
}
