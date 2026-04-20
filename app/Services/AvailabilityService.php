<?php

namespace App\Services;

use App\Models\Lesson;
use App\Models\LessonUser;
use App\Support\BusinessDateTime;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class AvailabilityService
{
    private const MAX_MONITORS = 2;

    private const STANDARD_MARGIN_MINUTES = 15;

    private const BIG_GROUP_MARGIN_MINUTES = 75;

    /**
     * Estados que SÍ bloquean monitor.
     */
    public function occupancyStatuses(): array
    {
        return [
            LessonUser::STATUS_CONFIRMED,
            LessonUser::STATUS_ENROLLED,
            LessonUser::STATUS_ATTENDED,
        ];
    }

    public function monitorsRequiredForPartySize(int $partySize): int
    {
        if ($partySize <= 0) {
            return 0;
        }

        return $partySize >= 7 ? 2 : 1;
    }

    public function marginsForPartySize(int $partySize): int
    {
        return $partySize >= 7
            ? self::BIG_GROUP_MARGIN_MINUTES
            : self::STANDARD_MARGIN_MINUTES;
    }

    /**
     * @return array{start: Carbon, end: Carbon}
     */
    public function operationalWindow(Carbon $startsAt, Carbon $endsAt, int $partySize): array
    {
        $margin = $this->marginsForPartySize($partySize);

        return [
            'start' => $startsAt->copy()->subMinutes($margin),
            'end' => $endsAt->copy()->addMinutes($margin),
        ];
    }

    /**
     * Evalúa si se puede guardar/confirmar una clase en la franja solicitada.
     *
     * @return array{
     *   allowed: bool,
     *   request_monitors: int,
     *   peak_monitors_used: int,
     *   max_capacity: int,
     *   request_window_start: string,
     *   request_window_end: string,
     *   conflicts: array<int, array<string, mixed>>
     * }
     */
    public function evaluate(
        Carbon $startsAt,
        Carbon $endsAt,
        int $projectedPartySize = 1,
        int $excludeLessonId = 0
    ): array {
        $startsAt = $startsAt->copy()->timezone(BusinessDateTime::businessTimezone());
        $endsAt = $endsAt->copy()->timezone(BusinessDateTime::businessTimezone());
        $requestMonitors = $this->monitorsRequiredForPartySize($projectedPartySize);
        $requestWindow = $this->operationalWindow($startsAt, $endsAt, $projectedPartySize);
        $intervals = $this->buildIntervals($requestWindow['start'], $requestWindow['end'], $excludeLessonId);
        $peakMonitorsUsed = $this->peakUsage($intervals, $requestWindow['start'], $requestWindow['end']);
        $freeAtPeak = max(0, self::MAX_MONITORS - $peakMonitorsUsed);

        $maxCapacity = $freeAtPeak >= 2 ? 12 : ($freeAtPeak === 1 ? 6 : 0);
        $allowed = ($peakMonitorsUsed + $requestMonitors) <= self::MAX_MONITORS;

        $conflicts = collect($intervals)
            ->filter(fn (array $row) => $this->overlaps(
                $row['window_start'],
                $row['window_end'],
                $requestWindow['start'],
                $requestWindow['end']
            ))
            ->map(fn (array $row) => [
                'lesson_id' => (int) $row['lesson_id'],
                'title' => (string) $row['title'],
                'party_size' => (int) $row['party_size'],
                'monitors_required' => (int) $row['monitors_required'],
                'window_start' => BusinessDateTime::toApi($row['window_start']),
                'window_end' => BusinessDateTime::toApi($row['window_end']),
            ])
            ->values()
            ->all();

        $occupiedLessonIds = collect($conflicts)->pluck('lesson_id')->unique()->values()->all();

        Log::info('Monitores ocupados detectados: '.$peakMonitorsUsed, [
            'request_monitors' => $requestMonitors,
            'projected_party_size' => $projectedPartySize,
            'request_window_start' => $requestWindow['start']->toDateTimeString(),
            'request_window_end' => $requestWindow['end']->toDateTimeString(),
            'exclude_lesson_id' => $excludeLessonId,
            'conflicts_count' => count($conflicts),
        ]);
        Log::debug('AvailabilityService debug', [
            'tz' => BusinessDateTime::businessTimezone(),
            'starts_at' => $startsAt->toDateTimeString(),
            'ends_at' => $endsAt->toDateTimeString(),
            'window_start' => $requestWindow['start']->toDateTimeString(),
            'window_end' => $requestWindow['end']->toDateTimeString(),
            'occupied_lesson_ids' => $occupiedLessonIds,
            'exclude_lesson_id' => $excludeLessonId,
        ]);

        return [
            'allowed' => $allowed,
            'request_monitors' => $requestMonitors,
            'peak_monitors_used' => $peakMonitorsUsed,
            'max_capacity' => $maxCapacity,
            'request_window_start' => BusinessDateTime::toApi($requestWindow['start']),
            'request_window_end' => BusinessDateTime::toApi($requestWindow['end']),
            'occupied_lesson_ids' => $occupiedLessonIds,
            'conflicts' => $conflicts,
        ];
    }

    public function buildConflictMessage(array $evaluation): string
    {
        $base = 'Conflicto de staff: se supera la capacidad de 2 monitores en la franja seleccionada.';
        $window = " Ventana solicitada: {$evaluation['request_window_start']} - {$evaluation['request_window_end']}.";

        $first = collect($evaluation['conflicts'] ?? [])->first();
        if (! $first) {
            return $base.$window;
        }

        return $base.$window.' Clase en conflicto: '
            .($first['title'] ?: 'Clase')
            .' ('.$first['window_start'].' - '.$first['window_end'].').';
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function buildIntervals(Carbon $requestWindowStart, Carbon $requestWindowEnd, int $excludeLessonId): array
    {
        $requestWindowStart = $requestWindowStart->copy()->timezone(BusinessDateTime::businessTimezone());
        $requestWindowEnd = $requestWindowEnd->copy()->timezone(BusinessDateTime::businessTimezone());
        $statuses = $this->occupancyStatuses();

        $scanStart = $requestWindowStart->copy()->subMinutes(self::BIG_GROUP_MARGIN_MINUTES);
        $scanEnd = $requestWindowEnd->copy()->addMinutes(self::BIG_GROUP_MARGIN_MINUTES);

        $lessons = Lesson::query()
            ->where('status', '!=', Lesson::STATUS_CANCELLED)
            ->when($excludeLessonId > 0, fn ($q) => $q->where('id', '!=', $excludeLessonId))
            ->where('starts_at', '<', $scanEnd)
            ->where('ends_at', '>', $scanStart)
            ->with(['enrollments' => function ($q) use ($statuses) {
                $q->select('lesson_id', 'status', 'quantity', 'party_size')
                    ->whereIn('status', $statuses);
            }])
            ->get(['id', 'title', 'starts_at', 'ends_at']);

        return $lessons
            ->map(function (Lesson $lesson) {
                $partySize = (int) $lesson->enrollments->sum(
                    fn ($e) => (int) ($e->quantity ?? $e->party_size ?? 1)
                );

                if ($partySize <= 0) {
                    return null;
                }

                $window = $this->operationalWindow($lesson->starts_at, $lesson->ends_at, $partySize);

                return [
                    'lesson_id' => (int) $lesson->id,
                    'title' => (string) ($lesson->title ?? 'Clase'),
                    'party_size' => $partySize,
                    'monitors_required' => $this->monitorsRequiredForPartySize($partySize),
                    'window_start' => $window['start'],
                    'window_end' => $window['end'],
                ];
            })
            ->filter()
            ->values()
            ->all();
    }

    /**
     * @param  array<int, array<string,mixed>>  $intervals
     */
    private function peakUsage(array $intervals, Carbon $scopeStart, Carbon $scopeEnd): int
    {
        $events = [];

        foreach ($intervals as $interval) {
            if (! $this->overlaps($interval['window_start'], $interval['window_end'], $scopeStart, $scopeEnd)) {
                continue;
            }

            $start = $interval['window_start']->greaterThan($scopeStart) ? $interval['window_start'] : $scopeStart;
            $end = $interval['window_end']->lessThan($scopeEnd) ? $interval['window_end'] : $scopeEnd;

            $events[] = ['time' => $start, 'delta' => (int) $interval['monitors_required']];
            $events[] = ['time' => $end, 'delta' => -1 * (int) $interval['monitors_required']];
        }

        usort($events, function (array $a, array $b) {
            if ($a['time']->eq($b['time'])) {
                return $a['delta'] <=> $b['delta'];
            }

            return $a['time']->lt($b['time']) ? -1 : 1;
        });

        $current = 0;
        $peak = 0;
        foreach ($events as $event) {
            $current += (int) $event['delta'];
            $peak = max($peak, $current);
        }

        return $peak;
    }

    private function overlaps(Carbon $startA, Carbon $endA, Carbon $startB, Carbon $endB): bool
    {
        return $startA->lt($endB) && $endA->gt($startB);
    }
}
