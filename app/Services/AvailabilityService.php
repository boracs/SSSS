<?php

declare(strict_types=1);

namespace App\Services;

use App\Exceptions\TransactionRequiredException;
use App\Models\Lesson;
use App\Models\LessonUser;
use App\Models\StaffAssignment;
use App\Support\BusinessDateTime;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AvailabilityService
{
    private const MAX_MONITORS = 2;

    private const STANDARD_MARGIN_MINUTES = 15;

    private const BIG_GROUP_MARGIN_MINUTES = 75;

    /**
     * @return list<string>
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

    /**
     * Tamaño de grupo efectivo para cupo de monitores: clases configuradas con 7+ plazas
     * reservan 2 monitores aunque aún no estén todas ocupadas.
     */
    public function effectivePartySizeForLesson(int $enrolledCount, int $configuredMax): int
    {
        $partySize = max(1, $enrolledCount);

        if ($configuredMax >= 7) {
            $partySize = max($partySize, 7);
        }

        return $partySize;
    }

    public function marginsForPartySize(int $partySize): int
    {
        return $partySize >= 7
            ? self::BIG_GROUP_MARGIN_MINUTES
            : self::STANDARD_MARGIN_MINUTES;
    }

    /**
     * Bloquea la fila de `lessons` y ejecuta el callback con el modelo fresco.
     *
     * @template T
     *
     * @param  callable(Lesson): T  $callback
     * @return T
     */
    public function withLockedLesson(int $lessonId, callable $callback): mixed
    {
        $this->assertActiveTransaction(__FUNCTION__);

        $lesson = Lesson::query()->whereKey($lessonId)->lockForUpdate()->firstOrFail();

        return $callback($lesson);
    }

    /**
     * Evaluación de cupo para UI admin/cliente (transacción de solo lectura).
     *
     * @return array{
     *   allowed: bool,
     *   request_monitors: int,
     *   peak_monitors_used: int,
     *   max_capacity: int,
     *   request_window_start: string,
     *   request_window_end: string,
     *   occupied_lesson_ids: list<int>,
     *   conflicts: list<array<string, mixed>>
     * }
     */
    public function preview(
        Carbon $startsAt,
        Carbon $endsAt,
        int $projectedPartySize = 1,
        int $excludeLessonId = 0
    ): array {
        return DB::transaction(fn () => $this->evaluate($startsAt, $endsAt, $projectedPartySize, $excludeLessonId));
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
     * Evalúa cupo de monitores. Requiere transacción activa (usar dentro de withLockedLesson o DB::transaction).
     *
     * @return array{
     *   allowed: bool,
     *   request_monitors: int,
     *   peak_monitors_used: int,
     *   max_capacity: int,
     *   request_window_start: string,
     *   request_window_end: string,
     *   occupied_lesson_ids: list<int>,
     *   conflicts: list<array<string, mixed>>
     * }
     */
    public function evaluate(
        Carbon $startsAt,
        Carbon $endsAt,
        int $projectedPartySize = 1,
        int $excludeLessonId = 0
    ): array {
        $this->assertActiveTransaction(__FUNCTION__);

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

        Log::info('AvailabilityService::evaluate', [
            'request_monitors' => $requestMonitors,
            'projected_party_size' => $projectedPartySize,
            'peak_monitors_used' => $peakMonitorsUsed,
            'allowed' => $allowed,
            'exclude_lesson_id' => $excludeLessonId,
            'conflicts_count' => count($conflicts),
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

    /**
     * Datos estructurados para mostrar conflictos de monitores en la UI admin.
     *
     * @param  array<string, mixed>  $evaluation
     * @return array{
     *   title: string,
     *   summary: string,
     *   requested_window: array{start: string, end: string},
     *   conflicts: list<array{lesson_id: int, title: string, party_size: int, monitors_required: int, window_start: string, window_end: string}>
     * }
     */
    public function buildConflictPayload(array $evaluation): array
    {
        $conflicts = collect($evaluation['conflicts'] ?? [])
            ->map(fn (array $row) => [
                'lesson_id' => (int) ($row['lesson_id'] ?? 0),
                'title' => (string) ($row['title'] ?: 'Clase'),
                'party_size' => (int) ($row['party_size'] ?? 0),
                'monitors_required' => (int) ($row['monitors_required'] ?? 1),
                'window_start' => (string) ($row['window_start'] ?? ''),
                'window_end' => (string) ($row['window_end'] ?? ''),
            ])
            ->values()
            ->all();

        $summary = $conflicts === []
            ? 'No hay monitores disponibles en la franja seleccionada (se requiere margen operativo antes y después de la clase).'
            : 'La franja elegida se solapa con otra clase que ya consume monitores en ese horario.';

        return [
            'title' => 'Conflicto de monitores',
            'summary' => $summary,
            'requested_window' => [
                'start' => (string) ($evaluation['request_window_start'] ?? ''),
                'end' => (string) ($evaluation['request_window_end'] ?? ''),
            ],
            'conflicts' => $conflicts,
        ];
    }

    public function buildConflictMessage(array $evaluation): string
    {
        $payload = $this->buildConflictPayload($evaluation);
        $lines = [$payload['title'].'. '.$payload['summary']];

        if ($payload['requested_window']['start'] !== '' && $payload['requested_window']['end'] !== '') {
            $lines[] = 'Franja solicitada: '.$payload['requested_window']['start'].' – '.$payload['requested_window']['end'];
        }

        $first = $payload['conflicts'][0] ?? null;
        if ($first !== null) {
            $lines[] = 'Clase en conflicto: '.$first['title'].' ('.$first['window_start'].' – '.$first['window_end'].')';
        }

        return implode(' ', $lines);
    }

    /**
     * Estado legible del pool de monitores (Borja + Willy) para UI admin.
     *
     * @param  array<string, mixed>  $evaluation
     * @return array{
     *   status: 'full'|'limited'|'exhausted',
     *   monitors_free: int,
     *   monitors_peak_used: int,
     *   label: string,
     *   message: string,
     *   show_warning: bool
     * }
     */
    public function describeCapacity(array $evaluation): array
    {
        $maxCapacity = (int) ($evaluation['max_capacity'] ?? 0);
        $peakUsed = (int) ($evaluation['peak_monitors_used'] ?? 0);
        $free = max(0, self::MAX_MONITORS - $peakUsed);

        if ($maxCapacity === 0) {
            return [
                'status' => 'exhausted',
                'monitors_free' => 0,
                'monitors_peak_used' => $peakUsed,
                'label' => 'Sin monitores',
                'message' => 'Borja y Willy están ocupados en esta franja (15 min antes y después de la clase). No se pueden reservar más sesiones.',
                'show_warning' => true,
            ];
        }

        if ($maxCapacity === 6) {
            return [
                'status' => 'limited',
                'monitors_free' => 1,
                'monitors_peak_used' => $peakUsed,
                'label' => '1 monitor libre',
                'message' => 'Solo queda 1 monitor disponible (Borja o Willy). Capacidad máxima en esta franja: 6 alumnos.',
                'show_warning' => true,
            ];
        }

        return [
            'status' => 'full',
            'monitors_free' => min(2, $free),
            'monitors_peak_used' => $peakUsed,
            'label' => '2 monitores libres',
            'message' => 'Ambos monitores disponibles. Capacidad máxima en esta franja: 12 alumnos.',
            'show_warning' => false,
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function buildIntervals(Carbon $requestWindowStart, Carbon $requestWindowEnd, int $excludeLessonId): array
    {
        $this->assertActiveTransaction('buildIntervals');

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
            ->with([
                'staffAssignments' => function ($q) {
                    $q->select('lesson_id', 'role')->where('role', StaffAssignment::ROLE_MONITOR);
                },
                'enrollments' => function ($q) use ($statuses) {
                    $q->select('lesson_id', 'status', 'quantity', 'party_size')
                        ->whereIn('status', $statuses);
                },
            ])
            ->get(['id', 'title', 'starts_at', 'ends_at', 'max_slots', 'max_capacity']);

        return $lessons
            ->map(function (Lesson $lesson) {
                $enrolledPartySize = (int) $lesson->enrollments->sum(
                    fn ($e) => (int) ($e->quantity ?? $e->party_size ?? 1)
                );
                $configuredMax = (int) ($lesson->max_slots ?? $lesson->max_capacity ?? 6);
                $hasAssignedMonitor = $lesson->staffAssignments->isNotEmpty();
                $partySize = $this->effectivePartySizeForLesson($enrolledPartySize, $configuredMax);
                $partySize = max($partySize, $hasAssignedMonitor ? 1 : 0);

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
     * @param  list<array<string, mixed>>  $intervals
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

    private function assertActiveTransaction(string $method): void
    {
        if (DB::transactionLevel() < 1) {
            throw TransactionRequiredException::forMethod(self::class, $method);
        }
    }
}
