<?php

declare(strict_types=1);

namespace App\Services\SurfConditions;

use App\DTOs\SurfConditions\SurfLevelStarsDto;
use App\Models\SurfDailyBrief;
use Illuminate\Support\Carbon;

/**
 * Termómetro de estrellas: lee el JSON del spot + umbrales de config.
 * Sin Gemini. El parte debe recibir este resultado, no inventar notas.
 */
final class SurfLevelQualityStarsService
{
    public function __construct(
        private readonly ZurriolaSpotLogisticsService $logistics,
    ) {}

    public function forSlot(
        int $energyKj,
        float $waveHeightM,
        float $wavePeriodS,
        string $windState,
        float $windSpeedKmh,
        string $signal,
        Carbon $at,
        ?string $tidePhase = null,
        ?int $windDirectionDeg = null,
    ): SurfLevelStarsDto {
        $mod = $this->logistics->starModifiers();
        $windRules = $this->logistics->windEnergyRules();
        $base = $this->logistics->energyBaseStars($energyKj);
        $windScore = $this->windScoreForBlend($windState, $windSpeedKmh, $mod, $windRules);
        $energyWeight = max(1, (int) ($mod['energy_weight'] ?? 2));
        $windWeight = max(1, (int) ($mod['wind_weight'] ?? 1));

        $ini = $this->blendWithWind($base->iniciacion, $windScore, $energyWeight, $windWeight);
        $int = $this->blendWithWind($base->intermedio, $windScore, $energyWeight, $windWeight);
        $ava = $this->blendWithWind($base->avanzado, $windScore, $energyWeight, $windWeight);

        [$ini, $int, $ava] = $this->applyWindEnergyRules(
            $ini,
            $int,
            $ava,
            $windState,
            $windSpeedKmh,
            $energyKj,
            $windRules,
            $windDirectionDeg,
        );

        [$ini, $int, $ava] = $this->applyRipCaps($ini, $int, $ava, $energyKj, $mod);
        [$ini, $int, $ava] = $this->applySummerPeriod($ini, $int, $ava, $wavePeriodS, $at, $mod);
        [$ini, $int, $ava] = $this->applyLargeSwellTide($ini, $int, $ava, $energyKj, $tidePhase);
        [$ini, $int, $ava] = $this->applyClosedCap($ini, $int, $ava, $signal, $mod);

        return new SurfLevelStarsDto(
            iniciacion: $this->clamp($ini),
            intermedio: $this->clamp($int),
            avanzado: $this->clamp($ava),
        );
    }

    /** @param  array<string, mixed>  $mod */
    private function windScore(string $windState, array $mod): int
    {
        $scores = $mod['wind_state_score'] ?? [];
        if (is_array($scores) && isset($scores[$windState])) {
            return (int) $scores[$windState];
        }

        return 3;
    }

    private function glassyMaxKmh(array $windRules): float
    {
        $g = is_array($windRules['glassy'] ?? null) ? $windRules['glassy'] : [];

        return (float) ($g['max_kmh'] ?? config('services.zurriola_surf.wind_glassy_max_kmh', 5));
    }

    /**
     * Norte flojo (0–10 km/h) no debe puntuar como onshore horrible.
     *
     * @param  array<string, mixed>  $mod
     * @param  array<string, mixed>  $windRules
     */
    private function windScoreForBlend(string $windState, float $windSpeedKmh, array $mod, array $windRules): int
    {
        $base = $this->windScore($windState, $mod);
        if (! $this->isOnshoreFamily($windState)) {
            return $base;
        }

        $north = is_array($windRules['north'] ?? null) ? $windRules['north'] : [];
        $goodMax = (float) ($north['good_max_kmh'] ?? 10);
        $choppyMax = (float) ($north['choppy_max_kmh'] ?? 15);
        if ($windSpeedKmh <= $goodMax) {
            return (int) ($north['good_wind_score'] ?? 4);
        }
        if ($windSpeedKmh <= $choppyMax) {
            return (int) ($north['choppy_wind_score'] ?? 3);
        }

        return $base;
    }

    /** El viento malo baja nota; el bueno no “rescata” un 1 (no merece la pena). */
    private function blendWithWind(int $energyStars, int $windScore, int $energyWeight, int $windWeight): int
    {
        if ($energyStars <= 1) {
            return 1;
        }

        $den = $energyWeight + $windWeight;

        return (int) round(($energyStars * $energyWeight + $windScore * $windWeight) / $den);
    }

    private function isOnshoreFamily(string $windState): bool
    {
        return in_array($windState, [
            SurfWindStateClassifier::ONSHORE,
            SurfWindStateClassifier::CROSS_ONSHORE,
        ], true);
    }

    private function isOffshoreFamily(string $windState): bool
    {
        return in_array($windState, [
            SurfWindStateClassifier::OFFSHORE,
            SurfWindStateClassifier::CROSS_OFFSHORE,
        ], true);
    }

    /**
     * @param  array<string, mixed>  $windRules
     * @return array{0: int, 1: int, 2: int}
     */
    private function applyWindEnergyRules(
        int $ini,
        int $int,
        int $ava,
        string $windState,
        float $windSpeedKmh,
        int $energyKj,
        array $windRules,
        ?int $windDirectionDeg = null,
    ): array {
        if ($windState === SurfWindStateClassifier::GLASSY && $windSpeedKmh <= $this->glassyMaxKmh($windRules)) {
            [$ini, $int, $ava] = $this->applyGlassyBands($ini, $int, $ava, $energyKj, $windRules, $windSpeedKmh, $windDirectionDeg);
        } elseif ($this->isOffshoreFamily($windState)) {
            [$ini, $int, $ava] = $this->applySouthBands($ini, $int, $ava, $windSpeedKmh, $energyKj, $windRules);
        } elseif ($this->isOnshoreFamily($windState)) {
            [$ini, $int, $ava] = $this->applyNorthCaps($ini, $int, $ava, $windSpeedKmh, $windRules);
        }

        return $this->applyKj70to99($ini, $int, $ava, $windState, $windSpeedKmh, $energyKj, $windRules);
    }

    /**
     * Norte respecto al offshore de Zurriola (sur ≈ 180°). Sin dirección = no asumir norte.
     */
    private function isNorthish(?int $windDirectionDeg): bool
    {
        if ($windDirectionDeg === null) {
            return false;
        }

        $center = (float) config('services.zurriola_surf.offshore_wind_center_deg', 180);
        $diff = abs(fmod(($windDirectionDeg - $center + 180 + 360), 360) - 180);

        return $diff > 90.0;
    }

    /**
     * 70–99 kJ: ini perfecto; int escaso (4 glass / 3 sur); ava pequeño (tope 3; sin buen viento tope 2).
     *
     * @param  array<string, mixed>  $windRules
     * @return array{0: int, 1: int, 2: int}
     */
    private function applyKj70to99(
        int $ini,
        int $int,
        int $ava,
        string $windState,
        float $windSpeedKmh,
        int $energyKj,
        array $windRules,
    ): array {
        $b = is_array($windRules['kj_70_99'] ?? null) ? $windRules['kj_70_99'] : [];
        $min = (int) ($b['min_kj'] ?? 70);
        $max = (int) ($b['max_kj'] ?? 99);
        if ($energyKj < $min || $energyKj > $max) {
            return [$ini, $int, $ava];
        }

        if ($ini <= 1 && $int <= 1 && $ava <= 1) {
            return [$ini, $int, $ava];
        }

        $goodGlassy = $windState === SurfWindStateClassifier::GLASSY
            && $windSpeedKmh <= $this->glassyMaxKmh($windRules);
        $goodSouth = $this->isOffshoreFamily($windState);

        if ($goodGlassy || $goodSouth) {
            $ini = (int) ($b['good_iniciacion'] ?? 5);
            $int = $goodGlassy
                ? (int) ($b['glassy_intermedio'] ?? 4)
                : (int) ($b['south_intermedio'] ?? 3);
            $ava = (int) ($b['good_avanzado'] ?? 3);

            return [$ini, $int, $ava];
        }

        $int = min($int, (int) ($b['bad_wind_intermedio_cap'] ?? 2));
        $ava = min($ava, (int) ($b['bad_wind_avanzado_cap'] ?? 2));

        return [$ini, $int, $ava];
    }

    /**
     * @param  array<string, mixed>  $windRules
     * @return array{0: int, 1: int, 2: int}
     */
    private function applyGlassyBands(
        int $ini,
        int $int,
        int $ava,
        int $energyKj,
        array $windRules,
        float $windSpeedKmh,
        ?int $windDirectionDeg,
    ): array {
        $g = is_array($windRules['glassy'] ?? null) ? $windRules['glassy'] : [];
        $iniIntMin = (int) ($g['ini_int_min_kj'] ?? 100);
        $iniIntMax = (int) ($g['ini_int_max_kj'] ?? 500);
        if ($energyKj >= $iniIntMin && $energyKj <= $iniIntMax) {
            $ini = (int) ($g['ini_int_stars'] ?? 5);
            $int = (int) ($g['ini_int_stars'] ?? 5);
        }

        $avaIdealMin = (int) ($g['ava_ideal_min_kj'] ?? 400);
        $avaIdealMax = (int) ($g['ava_ideal_max_kj'] ?? 1000);
        $avaSmallMin = (int) ($g['ava_small_min_kj'] ?? 100);
        $avaSmallMax = (int) ($g['ava_small_max_kj'] ?? 400);
        if ($energyKj >= $avaIdealMin && $energyKj <= $avaIdealMax) {
            $calmMax = (float) ($g['ava_calm_max_kmh'] ?? 1);
            $northLight = (int) ($g['ava_north_light_stars'] ?? 4);
            $ideal = (int) ($g['ava_ideal_stars'] ?? 5);
            $ava = ($this->isNorthish($windDirectionDeg) && $windSpeedKmh > $calmMax)
                ? $northLight
                : $ideal;
        } elseif ($energyKj >= $avaSmallMin && $energyKj < $avaIdealMin) {
            $ava = (int) ($g['ava_small_stars'] ?? 4);
        }

        return [$ini, $int, $ava];
    }

    /**
     * Sur: ≥25 km/h y mar pequeño → no merece (1★). Con fuerza, >20 km/h abre tubo.
     * 10–20 km/h + 200–400 kJ: se surfea a gusto (~3★). Solape 10–15 + 100–400:
     * si entra en la banda “frena”, esa manda.
     *
     * @param  array<string, mixed>  $windRules
     * @return array{0: int, 1: int, 2: int}
     */
    private function applySouthBands(
        int $ini,
        int $int,
        int $ava,
        float $windSpeedKmh,
        int $energyKj,
        array $windRules,
    ): array {
        $s = is_array($windRules['south'] ?? null) ? $windRules['south'] : [];
        $strongMin = (float) ($s['strong_min_kmh'] ?? 20);
        $notWorthMinKmh = (float) ($s['not_worth_min_kmh'] ?? 25);
        $notWorthMaxKj = (int) ($s['not_worth_max_kj'] ?? 400);
        $tubesMinKj = (int) ($s['tubes_min_kj'] ?? 400);

        if ($windSpeedKmh >= $notWorthMinKmh && $energyKj < $notWorthMaxKj) {
            $n = (int) ($s['not_worth_stars'] ?? 1);

            return [$n, $n, $n];
        }

        $avaSweetMin = (int) ($s['ava_sweet_min_kj'] ?? 400);
        $avaSweetMax = (int) ($s['ava_sweet_max_kj'] ?? 1000);
        if ($energyKj >= $avaSweetMin && $energyKj <= $avaSweetMax) {
            $ava = (int) ($s['ava_sweet_stars'] ?? 5);
        }

        if ($windSpeedKmh > $strongMin && $energyKj >= $tubesMinKj) {
            return [
                (int) ($s['tubes_iniciacion'] ?? 3),
                (int) ($s['tubes_intermedio'] ?? 5),
                (int) ($s['tubes_avanzado'] ?? 5),
            ];
        }

        $brakeMinKmh = (float) ($s['brake_min_kmh'] ?? 10);
        $brakeMaxKmh = (float) ($s['brake_max_kmh'] ?? 20);
        $brakeMinKj = (int) ($s['brake_min_kj'] ?? 200);
        $brakeMaxKj = (int) ($s['brake_max_kj'] ?? 400);
        if (
            $windSpeedKmh >= $brakeMinKmh
            && $windSpeedKmh <= $brakeMaxKmh
            && $energyKj >= $brakeMinKj
            && $energyKj <= $brakeMaxKj
        ) {
            $n = (int) ($s['brake_stars'] ?? 3);

            return [$n, $n, $n];
        }

        $lightMax = (float) ($s['light_max_kmh'] ?? 15);
        $lightMinKj = (int) ($s['light_min_kj'] ?? 100);
        $lightMaxKj = (int) ($s['light_max_kj'] ?? 400);
        if (
            $windSpeedKmh <= $lightMax
            && $energyKj >= $lightMinKj
            && $energyKj <= $lightMaxKj
        ) {
            return [
                (int) ($s['light_iniciacion'] ?? 5),
                (int) ($s['light_intermedio'] ?? 5),
                (int) ($s['light_avanzado'] ?? 4),
            ];
        }

        return [$ini, $int, $ava];
    }

    /**
     * @param  array<string, mixed>  $windRules
     * @return array{0: int, 1: int, 2: int}
     */
    private function applyNorthCaps(int $ini, int $int, int $ava, float $windSpeedKmh, array $windRules): array
    {
        $n = is_array($windRules['north'] ?? null) ? $windRules['north'] : [];
        $goodMax = (float) ($n['good_max_kmh'] ?? 10);
        $choppyMax = (float) ($n['choppy_max_kmh'] ?? 15);

        if ($windSpeedKmh > $choppyMax) {
            $cap = (int) ($n['too_much_star_cap'] ?? 2);

            return [min($ini, $cap), min($int, $cap), min($ava, $cap)];
        }

        if ($windSpeedKmh > $goodMax) {
            $cap = (int) ($n['choppy_star_cap'] ?? 4);

            return [min($ini, $cap), min($int, $cap), min($ava, $cap)];
        }

        return [$ini, $int, $ava];
    }

    /**
     * @param  array<string, mixed>  $mod
     * @return array{0: int, 1: int, 2: int}
     */
    private function applyRipCaps(int $ini, int $int, int $ava, int $energyKj, array $mod): array
    {
        if ($energyKj < $this->logistics->ripCurrentTriggerKj()) {
            return [$ini, $int, $ava];
        }

        $caps = $mod['rip_current_star_caps'] ?? [];
        if (! is_array($caps)) {
            return [$ini, $int, $ava];
        }

        return [
            min($ini, (int) ($caps['iniciacion'] ?? 2)),
            min($int, (int) ($caps['intermedio'] ?? 4)),
            min($ava, (int) ($caps['avanzado'] ?? 5)),
        ];
    }

    /**
     * @param  array<string, mixed>  $mod
     * @return array{0: int, 1: int, 2: int}
     */
    private function applySummerPeriod(int $ini, int $int, int $ava, float $wavePeriodS, Carbon $at, array $mod): array
    {
        $month = (int) $at->month;
        if (! in_array($month, $this->logistics->summerMonths(), true)) {
            return [$ini, $int, $ava];
        }

        $long = (float) ($mod['summer_long_period_seconds'] ?? 12);
        $sub = (int) ($mod['summer_long_period_subtract'] ?? 1);
        $very = (float) ($mod['summer_very_long_period_seconds'] ?? 14);
        $extraIni = (int) ($mod['summer_very_long_iniciacion_extra_subtract'] ?? 1);

        if ($wavePeriodS >= $long) {
            $ini -= $sub;
            $int -= $sub;
            $ava -= $sub;
        }
        if ($wavePeriodS >= $very) {
            $ini -= $extraIni;
        }

        return [$ini, $int, $ava];
    }

    /**
     * Mar gordo (≥2000 kJ): iniciación peligrosa (más si alta); int/ava
     * un poco mejor en baja (pico de atrás) y alta (piscina del espigón).
     *
     * @return array{0: int, 1: int, 2: int}
     */
    private function applyLargeSwellTide(int $ini, int $int, int $ava, int $energyKj, ?string $tidePhase): array
    {
        $cfg = null;
        $variables = $this->logistics->decoded()['variables'] ?? null;
        if (is_array($variables)) {
            $cfg = $variables['large_swell_tide_zones'] ?? null;
        }
        if (! is_array($cfg)) {
            return [$ini, $int, $ava];
        }

        $minKj = (int) ($cfg['min_kj'] ?? 2000);
        if ($energyKj < $minKj || $tidePhase === null) {
            return [$ini, $int, $ava];
        }

        $iniCap = $tidePhase === 'high'
            ? (int) ($cfg['star_iniciacion_cap_high'] ?? 1)
            : (int) ($cfg['star_iniciacion_cap_low_mid'] ?? 2);
        $ini = min($ini, $iniCap);

        $adjustKey = match ($tidePhase) {
            'low' => 'star_int_ava_adjust_low',
            'high' => 'star_int_ava_adjust_high',
            default => 'star_int_ava_adjust_mid',
        };
        $adjust = (int) ($cfg[$adjustKey] ?? 0);
        $int += $adjust;
        $ava += $adjust;

        return [$ini, $int, $ava];
    }

    /**
     * @param  list<\App\DTOs\SurfConditions\SurfTideEventDto>  $events
     */
    public function tidePhaseAt(Carbon $at, array $events): ?string
    {
        if ($events === []) {
            return null;
        }

        $nearestHighHours = null;
        $nearestLowHours = null;
        foreach ($events as $event) {
            $when = Carbon::parse($event->time);
            $hours = abs($at->getTimestamp() - $when->getTimestamp()) / 3600.0;
            if ($event->type === 'alta') {
                $nearestHighHours = $nearestHighHours === null ? $hours : min($nearestHighHours, $hours);
            } elseif ($event->type === 'baja') {
                $nearestLowHours = $nearestLowHours === null ? $hours : min($nearestLowHours, $hours);
            }
        }

        $window = 2.5;
        $highOk = $nearestHighHours !== null && $nearestHighHours <= $window;
        $lowOk = $nearestLowHours !== null && $nearestLowHours <= $window;

        if ($highOk && ! $lowOk) {
            return 'high';
        }
        if ($lowOk && ! $highOk) {
            return 'low';
        }
        if ($highOk && $lowOk) {
            return $nearestHighHours <= $nearestLowHours ? 'high' : 'low';
        }

        return 'mid';
    }

    /**
     * @param  array<string, mixed>  $mod
     * @return array{0: int, 1: int, 2: int}
     */
    private function applyClosedCap(int $ini, int $int, int $ava, string $signal, array $mod): array
    {
        if ($signal !== SurfDailyBrief::OVERRIDE_CLOSED) {
            return [$ini, $int, $ava];
        }

        $cap = (int) ($mod['closed_star_cap'] ?? 2);

        return [min($ini, $cap), min($int, $cap), min($ava, $cap)];
    }

    private function clamp(int $stars): int
    {
        return max(1, min(5, $stars));
    }
}
