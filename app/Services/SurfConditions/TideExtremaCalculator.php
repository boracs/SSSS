<?php

declare(strict_types=1);

namespace App\Services\SurfConditions;

use App\DTOs\SurfConditions\SurfTideEventDto;
use Illuminate\Support\Carbon;

/**
 * Detecta marea alta/baja como máximos/mínimos locales de la curva horaria
 * de `sea_level_height_msl` (Open-Meteo) y calcula cuánto sube/baja entre
 * extremos consecutivos (amplitud de cada semidiurno).
 *
 * Open-Meteo entrega nivel del mar a resolución horaria; el instante del
 * extremo se refina con interpolación parabólica entre la muestra y sus
 * vecinos (minutos realistas, no siempre :00). Sigue siendo una estimación,
 * no el dato oficial de un puerto.
 */
final class TideExtremaCalculator
{
    /**
     * @param  list<string>  $times
     * @param  list<float|null>  $heights
     * @return array{
     *     events: list<SurfTideEventDto>,
     *     rise_m: float|null,
     *     fall_m: float|null
     * }
     */
    public function extremaForDate(array $times, array $heights, string $datePrefix): array
    {
        $all = $this->allExtrema($times, $heights);
        $dayEvents = array_values(array_filter(
            $all,
            static fn (SurfTideEventDto $event): bool => str_starts_with($event->time, $datePrefix),
        ));

        $rises = [];
        $falls = [];
        foreach ($dayEvents as $event) {
            if ($event->deltaM === null) {
                continue;
            }
            if ($event->type === 'alta' && $event->deltaM > 0) {
                $rises[] = $event->deltaM;
            }
            if ($event->type === 'baja' && $event->deltaM < 0) {
                $falls[] = abs($event->deltaM);
            }
        }

        return [
            'events' => $dayEvents,
            'rise_m' => $rises !== [] ? round(array_sum($rises) / count($rises), 2) : null,
            'fall_m' => $falls !== [] ? round(array_sum($falls) / count($falls), 2) : null,
        ];
    }

    /**
     * @param  list<string>  $times
     * @param  list<float|null>  $heights
     * @return list<SurfTideEventDto>
     */
    private function allExtrema(array $times, array $heights): array
    {
        $events = [];
        $count = count($times);

        for ($i = 1; $i < $count - 1; $i++) {
            $prev = $heights[$i - 1];
            $current = $heights[$i];
            $next = $heights[$i + 1];

            if ($prev === null || $current === null || $next === null) {
                continue;
            }

            if ($current > $prev && $current >= $next) {
                $events[] = $this->buildRefinedEvent('alta', $times[$i], $prev, $current, $next);
            } elseif ($current < $prev && $current <= $next) {
                $events[] = $this->buildRefinedEvent('baja', $times[$i], $prev, $current, $next);
            }
        }

        return $this->attachDeltas($events);
    }

    /**
     * Ajusta hora/altura del extremo con parábola en (t=-1,0,1) → vecinos horarios.
     * Así un máximo en la muestra de las 08:00 puede mostrarse p. ej. como 08:18.
     */
    private function buildRefinedEvent(
        string $type,
        string $sampleTime,
        float $prev,
        float $current,
        float $next,
    ): SurfTideEventDto {
        $a = (($prev + $next) / 2.0) - $current;
        $b = ($next - $prev) / 2.0;

        $offsetHours = 0.0;
        $height = $current;

        if (abs($a) > 1.0e-6) {
            $t = -$b / (2.0 * $a);
            // El extremo continuo debe quedar cerca de la muestra que ya era el máx/mín discreto.
            $t = max(-0.49, min(0.49, $t));
            $offsetHours = $t;
            $height = ($a * $t * $t) + ($b * $t) + $current;
        }

        $moment = Carbon::parse($sampleTime)->addMinutes((int) round($offsetHours * 60));

        return new SurfTideEventDto(
            type: $type,
            time: $moment->format('Y-m-d\TH:i'),
            hourLabel: $moment->format('H:i'),
            heightM: round($height, 2),
            deltaM: null,
        );
    }

    /**
     * @param  list<SurfTideEventDto>  $events
     * @return list<SurfTideEventDto>
     */
    private function attachDeltas(array $events): array
    {
        $withDelta = [];

        foreach ($events as $index => $event) {
            $delta = null;
            if ($index > 0) {
                $previous = $events[$index - 1];
                $delta = round($event->heightM - $previous->heightM, 2);
            }

            $withDelta[] = new SurfTideEventDto(
                type: $event->type,
                time: $event->time,
                hourLabel: $event->hourLabel,
                heightM: $event->heightM,
                deltaM: $delta,
            );
        }

        return $withDelta;
    }
}
