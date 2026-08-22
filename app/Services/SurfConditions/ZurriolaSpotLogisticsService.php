<?php

declare(strict_types=1);

namespace App\Services\SurfConditions;

use App\DTOs\SurfConditions\SurfLevelStarsDto;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * Cuaderno técnico de Zurriola (`zurriola-spot-logistics.json`).
 * Lo leen las estrellas (PHP) y el parte (Gemini): misma ciencia, dos platos.
 */
final class ZurriolaSpotLogisticsService
{
    private const CACHE_KEY = 'zurriola.spot_logistics.v1';

    private const CACHE_TTL_SECONDS = 3600;

    /** @return array<string, mixed> */
    public function decoded(): array
    {
        $path = (string) config('services.zurriola_surf.logistics_json_path');
        if ($path === '' || ! is_readable($path)) {
            Log::warning('ZurriolaSpotLogisticsService: JSON no legible.', ['path' => $path]);

            return [];
        }

        $cacheKey = self::CACHE_KEY.'.'.(int) filemtime($path);

        return Cache::remember(
            $cacheKey,
            self::CACHE_TTL_SECONDS,
            function () use ($path): array {
                $decoded = json_decode((string) file_get_contents($path), true);

                return is_array($decoded) ? $decoded : [];
            },
        );
    }

    public function jsonBlockForPrompt(): string
    {
        $path = (string) config('services.zurriola_surf.logistics_json_path');
        if ($path === '' || ! is_readable($path)) {
            return '';
        }

        $contents = trim((string) file_get_contents($path));
        if ($contents === '') {
            return '';
        }

        return "\n\n# Reglas técnicas estructuradas de Zurriola (JSON)\n\n".$contents;
    }

    /** @return array<string, string> */
    public function metricHelp(): array
    {
        $help = $this->decoded()['ui_metric_help'] ?? [];
        if (! is_array($help)) {
            return [];
        }

        return array_map(static fn (mixed $text): string => (string) $text, $help);
    }

    public function energyBaseStars(int $energyKj): SurfLevelStarsDto
    {
        $kj = max(0, $energyKj);
        $variables = $this->decoded()['variables'] ?? [];
        $block = is_array($variables) ? ($variables['level_recommendation_by_energy_kj'] ?? []) : [];
        $rules = is_array($block) ? ($block['rules'] ?? []) : [];

        if (is_array($rules)) {
            foreach ($rules as $rule) {
                if (! is_array($rule)) {
                    continue;
                }
                $min = isset($rule['min_kj']) ? (int) $rule['min_kj'] : 0;
                $max = isset($rule['max_kj']) ? (int) $rule['max_kj'] : PHP_INT_MAX;
                if ($kj < $min || $kj > $max) {
                    continue;
                }
                $stars = $rule['stars'] ?? null;
                if (is_array($stars)) {
                    return new SurfLevelStarsDto(
                        iniciacion: $this->clamp((int) ($stars['iniciacion'] ?? 3)),
                        intermedio: $this->clamp((int) ($stars['intermedio'] ?? 3)),
                        avanzado: $this->clamp((int) ($stars['avanzado'] ?? 3)),
                    );
                }
            }
        }

        return new SurfLevelStarsDto(3, 3, 3);
    }

    /** @return array<string, mixed> */
    public function starModifiers(): array
    {
        $variables = $this->decoded()['variables'] ?? [];

        return is_array($variables) && is_array($variables['star_modifiers'] ?? null)
            ? $variables['star_modifiers']
            : [];
    }

    /** @return array<string, mixed> */
    public function windEnergyRules(): array
    {
        $variables = $this->decoded()['variables'] ?? [];

        return is_array($variables) && is_array($variables['wind_energy_rules'] ?? null)
            ? $variables['wind_energy_rules']
            : [];
    }

    /** @return list<int> */
    public function summerMonths(): array
    {
        $advanced = $this->decoded()['advanced_oceanographic_rules'] ?? [];
        $seasonal = is_array($advanced) ? ($advanced['seasonal_bathymetry'] ?? []) : [];
        $months = is_array($seasonal) ? ($seasonal['summer_months'] ?? [6, 7, 8, 9]) : [6, 7, 8, 9];

        return array_values(array_map(static fn (mixed $m): int => (int) $m, is_array($months) ? $months : [6, 7, 8, 9]));
    }

    public function ripCurrentTriggerKj(): int
    {
        $advanced = $this->decoded()['advanced_oceanographic_rules'] ?? [];
        $rip = is_array($advanced) ? ($advanced['rip_current_safety'] ?? []) : [];

        return (int) (is_array($rip) ? ($rip['trigger_energy_kj'] ?? 1800) : 1800);
    }

    private function clamp(int $stars): int
    {
        return max(1, min(5, $stars));
    }
}
