<?php

declare(strict_types=1);

namespace Tests\Unit\SurfConditions;

use App\Models\SurfDailyBrief;
use App\Services\SurfConditions\SurfLevelQualityStarsService;
use App\Services\SurfConditions\SurfWindStateClassifier;
use App\Services\SurfConditions\ZurriolaSpotLogisticsService;
use Illuminate\Support\Carbon;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class SurfLevelQualityStarsServiceTest extends TestCase
{
    private function stars(): SurfLevelQualityStarsService
    {
        return new SurfLevelQualityStarsService(new ZurriolaSpotLogisticsService());
    }

    #[Test]
    public function small_energy_favours_iniciacion_not_avanzado(): void
    {
        $out = $this->stars()->forSlot(
            energyKj: 30,
            waveHeightM: 0.4,
            wavePeriodS: 8,
            windState: SurfWindStateClassifier::GLASSY,
            windSpeedKmh: 4,
            signal: SurfDailyBrief::OVERRIDE_GOOD,
            at: Carbon::parse('2026-01-15 10:00:00'),
        );

        $this->assertGreaterThan($out->avanzado, $out->iniciacion);
        $this->assertSame(1, $out->avanzado);
    }

    #[Test]
    public function mid_energy_is_good_for_intermedio(): void
    {
        $out = $this->stars()->forSlot(
            energyKj: 250,
            waveHeightM: 1.0,
            wavePeriodS: 10,
            windState: SurfWindStateClassifier::GLASSY,
            windSpeedKmh: 5,
            signal: SurfDailyBrief::OVERRIDE_GOOD,
            at: Carbon::parse('2026-01-15 10:00:00'),
        );

        $this->assertGreaterThanOrEqual(4, $out->intermedio);
        $this->assertGreaterThanOrEqual(4, $out->iniciacion);
    }

    #[Test]
    public function desfasado_does_not_crush_avanzado_to_one_star(): void
    {
        $out = $this->stars()->forSlot(
            energyKj: 2800,
            waveHeightM: 2.2,
            wavePeriodS: 12,
            windState: SurfWindStateClassifier::GLASSY,
            windSpeedKmh: 5,
            signal: SurfDailyBrief::OVERRIDE_CAUTION,
            at: Carbon::parse('2026-01-15 10:00:00'),
        );

        $this->assertGreaterThanOrEqual(2, $out->avanzado);
        $this->assertSame(1, $out->iniciacion);
    }

    #[Test]
    public function desfase_above_3000_kj_forbids_every_level(): void
    {
        $out = $this->stars()->forSlot(
            energyKj: 3200,
            waveHeightM: 4.0,
            wavePeriodS: 14,
            windState: SurfWindStateClassifier::GLASSY,
            windSpeedKmh: 5,
            signal: SurfDailyBrief::OVERRIDE_CAUTION,
            at: Carbon::parse('2026-01-15 10:00:00'),
        );

        $this->assertSame(1, $out->iniciacion);
        $this->assertSame(1, $out->intermedio);
        $this->assertSame(1, $out->avanzado);
    }

    #[Test]
    public function desfase_cap_survives_south_wind_that_would_open_tubes(): void
    {
        $out = $this->stars()->forSlot(
            energyKj: 3200,
            waveHeightM: 4.0,
            wavePeriodS: 14,
            windState: SurfWindStateClassifier::OFFSHORE,
            windSpeedKmh: 25,
            signal: SurfDailyBrief::OVERRIDE_CAUTION,
            at: Carbon::parse('2026-01-15 10:00:00'),
        );

        $this->assertSame(1, $out->avanzado);
    }

    #[Test]
    public function rip_current_caps_iniciacion_harder_than_avanzado(): void
    {
        $out = $this->stars()->forSlot(
            energyKj: 1900,
            waveHeightM: 1.8,
            wavePeriodS: 11,
            windState: SurfWindStateClassifier::GLASSY,
            windSpeedKmh: 5,
            signal: SurfDailyBrief::OVERRIDE_CAUTION,
            at: Carbon::parse('2026-01-15 10:00:00'),
        );

        $this->assertLessThanOrEqual(2, $out->iniciacion);
        $this->assertGreaterThan($out->iniciacion, $out->avanzado);
    }

    #[Test]
    public function summer_long_period_hurts_iniciacion_more_than_winter(): void
    {
        $winter = $this->stars()->forSlot(
            energyKj: 300,
            waveHeightM: 1.0,
            wavePeriodS: 14,
            windState: SurfWindStateClassifier::GLASSY,
            windSpeedKmh: 5,
            signal: SurfDailyBrief::OVERRIDE_GOOD,
            at: Carbon::parse('2026-01-15 10:00:00'),
        );
        $summer = $this->stars()->forSlot(
            energyKj: 300,
            waveHeightM: 1.0,
            wavePeriodS: 14,
            windState: SurfWindStateClassifier::GLASSY,
            windSpeedKmh: 5,
            signal: SurfDailyBrief::OVERRIDE_GOOD,
            at: Carbon::parse('2026-07-15 10:00:00'),
        );

        $this->assertLessThan($winter->iniciacion, $summer->iniciacion);
    }

    #[Test]
    public function large_swell_high_tide_caps_iniciacion_harder_than_low(): void
    {
        $base = [
            'energyKj' => 2200,
            'waveHeightM' => 2.0,
            'wavePeriodS' => 11,
            'windState' => SurfWindStateClassifier::GLASSY,
            'windSpeedKmh' => 5,
            'signal' => SurfDailyBrief::OVERRIDE_CAUTION,
            'at' => Carbon::parse('2026-01-15 10:00:00'),
        ];

        $high = $this->stars()->forSlot(...[...$base, 'tidePhase' => 'high']);
        $low = $this->stars()->forSlot(...[...$base, 'tidePhase' => 'low']);

        $this->assertSame(1, $high->iniciacion);
        $this->assertLessThanOrEqual(2, $low->iniciacion);
        $this->assertGreaterThan($high->iniciacion, $low->iniciacion);
        $this->assertGreaterThanOrEqual($high->avanzado, $low->avanzado);
    }

    #[Test]
    public function below_large_swell_tide_does_not_change_iniciacion_cap(): void
    {
        $base = [
            'energyKj' => 800,
            'waveHeightM' => 1.2,
            'wavePeriodS' => 10,
            'windState' => SurfWindStateClassifier::GLASSY,
            'windSpeedKmh' => 5,
            'signal' => SurfDailyBrief::OVERRIDE_GOOD,
            'at' => Carbon::parse('2026-01-15 10:00:00'),
        ];

        $high = $this->stars()->forSlot(...[...$base, 'tidePhase' => 'high']);
        $low = $this->stars()->forSlot(...[...$base, 'tidePhase' => 'low']);

        $this->assertSame($low->iniciacion, $high->iniciacion);
    }

    #[Test]
    public function strong_south_with_small_swell_is_not_worth_it(): void
    {
        $out = $this->stars()->forSlot(
            energyKj: 200,
            waveHeightM: 0.9,
            wavePeriodS: 9,
            windState: SurfWindStateClassifier::OFFSHORE,
            windSpeedKmh: 25,
            signal: SurfDailyBrief::OVERRIDE_GOOD,
            at: Carbon::parse('2026-01-15 10:00:00'),
        );

        $this->assertSame(1, $out->iniciacion);
        $this->assertSame(1, $out->intermedio);
        $this->assertSame(1, $out->avanzado);
    }

    #[Test]
    public function strong_south_with_enough_energy_is_good_for_tubes(): void
    {
        $out = $this->stars()->forSlot(
            energyKj: 500,
            waveHeightM: 1.4,
            wavePeriodS: 10,
            windState: SurfWindStateClassifier::OFFSHORE,
            windSpeedKmh: 25,
            signal: SurfDailyBrief::OVERRIDE_GOOD,
            at: Carbon::parse('2026-01-15 10:00:00'),
        );

        $this->assertGreaterThanOrEqual(4, $out->intermedio);
        $this->assertGreaterThanOrEqual(4, $out->avanzado);
        $this->assertLessThan($out->avanzado, $out->iniciacion);
    }

    #[Test]
    public function moderate_south_on_small_swell_is_three_stars(): void
    {
        $out = $this->stars()->forSlot(
            energyKj: 300,
            waveHeightM: 1.1,
            wavePeriodS: 10,
            windState: SurfWindStateClassifier::OFFSHORE,
            windSpeedKmh: 15,
            signal: SurfDailyBrief::OVERRIDE_GOOD,
            at: Carbon::parse('2026-01-15 10:00:00'),
        );

        $this->assertSame(3, $out->iniciacion);
        $this->assertSame(3, $out->intermedio);
        $this->assertSame(3, $out->avanzado);
    }

    #[Test]
    public function strong_north_caps_quality_because_sea_is_broken(): void
    {
        $out = $this->stars()->forSlot(
            energyKj: 300,
            waveHeightM: 1.1,
            wavePeriodS: 10,
            windState: SurfWindStateClassifier::ONSHORE,
            windSpeedKmh: 18,
            signal: SurfDailyBrief::OVERRIDE_GOOD,
            at: Carbon::parse('2026-01-15 10:00:00'),
        );

        $this->assertLessThanOrEqual(2, $out->iniciacion);
        $this->assertLessThanOrEqual(2, $out->intermedio);
        $this->assertLessThanOrEqual(2, $out->avanzado);
    }

    #[Test]
    public function avanzado_400_to_1000_is_five_with_calm_or_south(): void
    {
        $calm = $this->stars()->forSlot(
            energyKj: 600,
            waveHeightM: 1.5,
            wavePeriodS: 11,
            windState: SurfWindStateClassifier::GLASSY,
            windSpeedKmh: 0,
            signal: SurfDailyBrief::OVERRIDE_GOOD,
            at: Carbon::parse('2026-01-15 10:00:00'),
            windDirectionDeg: 180,
        );
        $south = $this->stars()->forSlot(
            energyKj: 600,
            waveHeightM: 1.5,
            wavePeriodS: 11,
            windState: SurfWindStateClassifier::OFFSHORE,
            windSpeedKmh: 12,
            signal: SurfDailyBrief::OVERRIDE_GOOD,
            at: Carbon::parse('2026-01-15 10:00:00'),
            windDirectionDeg: 180,
        );

        $this->assertSame(5, $calm->avanzado);
        $this->assertSame(5, $south->avanzado);
    }

    #[Test]
    public function avanzado_400_to_1000_north_five_kmh_is_four_stars(): void
    {
        $out = $this->stars()->forSlot(
            energyKj: 600,
            waveHeightM: 1.5,
            wavePeriodS: 11,
            windState: SurfWindStateClassifier::GLASSY,
            windSpeedKmh: 5,
            signal: SurfDailyBrief::OVERRIDE_GOOD,
            at: Carbon::parse('2026-01-15 10:00:00'),
            windDirectionDeg: 0,
        );

        $this->assertSame(4, $out->avanzado);
    }

    #[Test]
    public function kj_70_99_glassy_is_perfect_for_iniciacion_not_avanzado(): void
    {
        $out = $this->stars()->forSlot(
            energyKj: 80,
            waveHeightM: 0.6,
            wavePeriodS: 9,
            windState: SurfWindStateClassifier::GLASSY,
            windSpeedKmh: 0,
            signal: SurfDailyBrief::OVERRIDE_GOOD,
            at: Carbon::parse('2026-01-15 10:00:00'),
        );

        $this->assertSame(5, $out->iniciacion);
        $this->assertSame(4, $out->intermedio);
        $this->assertSame(3, $out->avanzado);
    }

    #[Test]
    public function kj_70_99_south_keeps_avanzado_at_three(): void
    {
        $out = $this->stars()->forSlot(
            energyKj: 80,
            waveHeightM: 0.6,
            wavePeriodS: 9,
            windState: SurfWindStateClassifier::OFFSHORE,
            windSpeedKmh: 12,
            signal: SurfDailyBrief::OVERRIDE_GOOD,
            at: Carbon::parse('2026-01-15 10:00:00'),
        );

        $this->assertSame(5, $out->iniciacion);
        $this->assertSame(3, $out->intermedio);
        $this->assertSame(3, $out->avanzado);
    }

    #[Test]
    public function kj_70_99_bad_wind_caps_avanzado_at_two(): void
    {
        $out = $this->stars()->forSlot(
            energyKj: 80,
            waveHeightM: 0.6,
            wavePeriodS: 9,
            windState: SurfWindStateClassifier::ONSHORE,
            windSpeedKmh: 8,
            signal: SurfDailyBrief::OVERRIDE_GOOD,
            at: Carbon::parse('2026-01-15 10:00:00'),
        );

        $this->assertLessThanOrEqual(2, $out->intermedio);
        $this->assertLessThanOrEqual(2, $out->avanzado);
    }
}
