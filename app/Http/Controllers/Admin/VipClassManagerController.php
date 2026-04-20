<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Lesson;
use App\Models\LessonUser;
use App\Models\StaffAssignment;
use App\Models\User;
use App\Services\AvailabilityService;
use App\Support\BusinessDateTime;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class VipClassManagerController extends Controller
{
    private const ACTIVE_ENROLLMENT_STATUSES = [
        LessonUser::STATUS_PENDING,
        LessonUser::STATUS_CONFIRMED,
        LessonUser::STATUS_ENROLLED,
        LessonUser::STATUS_ATTENDED,
        LessonUser::STATUS_PENDING_EXTRA_MONITOR,
    ];

    public function __construct(
        private readonly AvailabilityService $availabilityService
    ) {}

    public function index(Request $request)
    {
        $month = (string) $request->query('month', BusinessDateTime::now()->format('Y-m'));
        [$year, $m] = array_pad(array_map('intval', explode('-', $month)), 2, 0);
        if ($year < 2000 || $m < 1 || $m > 12) {
            $year = (int) BusinessDateTime::now()->format('Y');
            $m = (int) BusinessDateTime::now()->format('m');
            $month = sprintf('%04d-%02d', $year, $m);
        }

        $start = Carbon::create($year, $m, 1, 0, 0, 0, BusinessDateTime::businessTimezone())->startOfMonth()->startOfDay();
        $end = $start->copy()->endOfMonth()->endOfDay();

        $lessons = Lesson::query()
            ->with([
                'staffAssignments.user:id,nombre,apellido',
                'enrollments.user:id,nombre,apellido',
            ])
            ->where('modality', 'vip')
            ->whereBetween('starts_at', [$start, $end])
            ->orderBy('starts_at')
            ->get()
            ->map(function (Lesson $lesson) {
                $monitor = $lesson->staffAssignments->first(fn ($s) => $s->role === StaffAssignment::ROLE_MONITOR);
                $photographer = $lesson->staffAssignments->first(fn ($s) => $s->role === StaffAssignment::ROLE_FOTOGRAFO);
                $occupancy = (int) $lesson->enrollments()->whereIn('status', ['pending', 'confirmed', 'enrolled', 'attended'])->count();
                $dynamic = $this->availabilityService->evaluate($lesson->starts_at, $lesson->ends_at, 1, (int) $lesson->id);
                $capacity = (int) ($dynamic['max_capacity'] ?? ($lesson->max_capacity ?? $lesson->max_slots ?? 0));
                if ((int) ($lesson->max_capacity ?? 0) !== $capacity || (int) ($lesson->max_slots ?? 0) !== $capacity) {
                    $lesson->update([
                        'max_capacity' => $capacity,
                        'max_slots' => $capacity,
                    ]);
                }
                $students = $lesson->enrollments
                    ->whereIn('status', self::ACTIVE_ENROLLMENT_STATUSES)
                    ->map(function (LessonUser $enrollment) {
                        return trim((string) (($enrollment->user?->nombre ?? '').' '.($enrollment->user?->apellido ?? '')));
                    })
                    ->filter()
                    ->values()
                    ->all();

                return [
                    'id' => (int) $lesson->id,
                    'title' => $lesson->title ?: 'Clase VIP',
                    'starts_at' => $lesson->starts_at ? BusinessDateTime::toApi($lesson->starts_at) : null,
                    'ends_at' => $lesson->ends_at ? BusinessDateTime::toApi($lesson->ends_at) : null,
                    'level' => $lesson->level,
                    'location' => $lesson->location ?: 'Zurriola',
                    'status' => $lesson->status,
                    'occupancy' => $occupancy,
                    'max_capacity' => $capacity,
                    'monitor_id' => $monitor?->user_id ? (int) $monitor->user_id : null,
                    'photographer_id' => $photographer?->user_id ? (int) $photographer->user_id : null,
                    'has_photographer' => (bool) $photographer,
                    'monitor_name' => trim((string) (($monitor?->user?->nombre ?? '').' '.($monitor?->user?->apellido ?? ''))),
                    'photographer_name' => trim((string) (($photographer?->user?->nombre ?? '').' '.($photographer?->user?->apellido ?? ''))),
                    'students' => $students,
                ];
            })
            ->values();

        $staff = $this->buildStaffCatalog();

        return Inertia::render('Admin/VipManager', [
            'month' => $month,
            'lessons' => $lessons,
            'staff' => $staff,
        ]);
    }

    public function checkAvailability(Request $request)
    {
        $validated = $request->validate([
            'date' => 'required|date_format:Y-m-d',
            'time' => 'required|date_format:H:i',
            'duration_minutes' => 'nullable|integer|in:60,90',
            'exclude_lesson_id' => 'nullable|integer|exists:lessons,id',
        ]);

        $startsAt = $this->parseVipFormDateTime($validated['date'], $validated['time']);
        $durationMinutes = (int) ($validated['duration_minutes'] ?? 90);
        $endsAt = $startsAt->copy()->addMinutes($durationMinutes);
        if (! $this->isQuarterMinute($startsAt) || ! $this->isQuarterMinute($endsAt)) {
            return response()->json([
                'range_start' => BusinessDateTime::toApi($startsAt),
                'range_end' => BusinessDateTime::toApi($endsAt),
                'overlapping_classes' => 0,
                'max_capacity' => 0,
                'is_staff_exhausted' => true,
                'staff' => ['available' => [], 'occupied' => []],
                'message' => 'Las horas deben estar en intervalos de 15 minutos (:00, :15, :30, :45).',
            ], 422);
        }
        $minDuration = 60;
        if ($startsAt->diffInMinutes($endsAt) < $minDuration) {
            return response()->json([
                'range_start' => BusinessDateTime::toApi($startsAt),
                'range_end' => BusinessDateTime::toApi($endsAt),
                'overlapping_classes' => 0,
                'max_capacity' => 0,
                'is_staff_exhausted' => true,
                'staff' => ['available' => [], 'occupied' => []],
                'message' => 'La duración mínima de una sesión es de 1 hora.',
            ], 422);
        }
        $excludeLessonId = (int) ($validated['exclude_lesson_id'] ?? 0);
        $availability = $this->availabilityService->evaluate(
            $startsAt,
            $endsAt,
            1,
            $excludeLessonId
        );
        $rangeStart = BusinessDateTime::parseInAppTimezone((string) $availability['request_window_start']);
        $rangeEnd = BusinessDateTime::parseInAppTimezone((string) $availability['request_window_end']);
        $staffAvailability = $this->computeStaffAvailability($rangeStart, $rangeEnd, $excludeLessonId);

        $payload = [
            'range_start' => BusinessDateTime::toApi($rangeStart),
            'range_end' => BusinessDateTime::toApi($rangeEnd),
            'overlapping_classes' => count($availability['conflicts']),
            'max_capacity' => $availability['max_capacity'],
            'peak_monitors_used' => $availability['peak_monitors_used'] ?? null,
            'occupied_lesson_ids' => $availability['occupied_lesson_ids'] ?? [],
            'is_staff_exhausted' => $availability['max_capacity'] === 0,
            'staff' => $staffAvailability,
            'message' => $availability['max_capacity'] === 0
                ? 'No quedan monitores disponibles en este horario (se requiere disponibilidad 15 min antes y 15 min después).'
                : null,
        ];

        return response()->json($payload, $availability['max_capacity'] === 0 ? 422 : 200);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'date' => 'required|date_format:Y-m-d',
            'time' => 'required|date_format:H:i',
            'duration_minutes' => 'nullable|integer|in:60,90',
            'level' => 'required|in:iniciacion,intermedio,avanzado',
            'monitor_id' => 'nullable|integer|exists:users,id',
            'has_photographer' => 'nullable|boolean',
            'photographer_id' => 'nullable|integer|exists:users,id',
            'location' => 'nullable|string|max:150',
            'max_capacity' => 'required|integer|in:0,6,12',
        ]);

        $startsAt = $this->parseVipFormDateTime($validated['date'], $validated['time']);
        $durationMinutes = (int) ($validated['duration_minutes'] ?? 90);
        $endsAt = $startsAt->copy()->addMinutes($durationMinutes);
        if ($this->isCalendarDayBeforeTodayInMadrid($startsAt)) {
            return back()->withErrors([
                'date' => 'No se pueden crear clases VIP en fechas pasadas.',
            ])->withInput();
        }
        if (! $this->isQuarterMinute($startsAt) || ! $this->isQuarterMinute($endsAt)) {
            return back()->withErrors([
                'time' => 'Las horas deben estar en intervalos de 15 minutos (:00, :15, :30, :45).',
            ])->withInput();
        }
        $minDuration = 60;
        if ($startsAt->diffInMinutes($endsAt) < $minDuration) {
            return back()->withErrors([
                'time' => 'La duración mínima de una sesión es de 1 hora.',
            ])->withInput();
        }
        $projectedPartySize = ((int) ($validated['max_capacity'] ?? 6)) >= 7 ? 7 : 1;
        $availability = $this->availabilityService->evaluate($startsAt, $endsAt, $projectedPartySize, 0);
        $rangeStart = BusinessDateTime::parseInAppTimezone((string) $availability['request_window_start']);
        $rangeEnd = BusinessDateTime::parseInAppTimezone((string) $availability['request_window_end']);
        $staffAvailability = $this->computeStaffAvailability($rangeStart, $rangeEnd, 0);
        if (! $availability['allowed']) {
            return back()->withErrors([
                'time' => $this->availabilityService->buildConflictMessage($availability),
            ])->withInput();
        }
        $this->assertSelectedStaffIsAvailable($validated, $staffAvailability);

        $lesson = Lesson::create([
            'title' => 'VIP '.strtoupper((string) $validated['level']),
            'starts_at' => $startsAt,
            'ends_at' => $endsAt,
            'level' => $validated['level'],
            'type' => Lesson::TYPE_SURF,
            'modality' => 'vip',
            'max_slots' => (int) $availability['max_capacity'],
            'max_capacity' => (int) $availability['max_capacity'],
            'location' => (string) ($validated['location'] ?? 'Zurriola'),
            'status' => Lesson::STATUS_SCHEDULED,
            'is_private' => false,
            'price' => 0.0,
            'currency' => 'EUR',
            'internal_notes' => 'VIP_CREDIT_COST=1',
        ]);

        $this->syncVipStaffAssignments($lesson, $validated);
        $this->rebalanceVipCapacitiesForDate($startsAt);

        return back()->with('success', 'Clase VIP creada correctamente (consume 1 crédito por reserva).');
    }

    public function update(Request $request, Lesson $lesson)
    {
        abort_unless((string) $lesson->modality === 'vip', 403, 'Solo se pueden editar clases VIP en este panel.');

        $validated = $request->validate([
            'date' => 'required|date_format:Y-m-d',
            'time' => 'required|date_format:H:i',
            'duration_minutes' => 'nullable|integer|in:60,90',
            'level' => 'required|in:iniciacion,intermedio,avanzado',
            'monitor_id' => 'nullable|integer|exists:users,id',
            'has_photographer' => 'nullable|boolean',
            'photographer_id' => 'nullable|integer|exists:users,id',
            'location' => 'nullable|string|max:150',
            'max_capacity' => 'required|integer|in:0,6,12',
        ]);

        $startsAt = $this->parseVipFormDateTime($validated['date'], $validated['time']);
        $durationMinutes = (int) ($validated['duration_minutes'] ?? 90);
        $endsAt = $startsAt->copy()->addMinutes($durationMinutes);
        if ($this->wouldMoveFutureLessonToPastDay($lesson, $startsAt)) {
            return back()->withErrors([
                'time' => 'No se puede mover la clase a una fecha pasada.',
            ])->withInput();
        }
        if (! $this->isQuarterMinute($startsAt) || ! $this->isQuarterMinute($endsAt)) {
            return back()->withErrors([
                'time' => 'Las horas deben estar en intervalos de 15 minutos (:00, :15, :30, :45).',
            ])->withInput();
        }
        $minDuration = 60;
        if ($startsAt->diffInMinutes($endsAt) < $minDuration) {
            return back()->withErrors([
                'time' => 'La duración mínima de una sesión es de 1 hora.',
            ])->withInput();
        }
        $projectedPartySize = ((int) ($validated['max_capacity'] ?? 6)) >= 7 ? 7 : 1;
        $availability = $this->availabilityService->evaluate($startsAt, $endsAt, $projectedPartySize, (int) $lesson->id);
        $rangeStart = BusinessDateTime::parseInAppTimezone((string) $availability['request_window_start']);
        $rangeEnd = BusinessDateTime::parseInAppTimezone((string) $availability['request_window_end']);
        $staffAvailability = $this->computeStaffAvailability($rangeStart, $rangeEnd, (int) $lesson->id);
        if (! $availability['allowed']) {
            return back()->withErrors([
                'time' => $this->availabilityService->buildConflictMessage($availability),
            ])->withInput();
        }
        $this->assertSelectedStaffIsAvailable($validated, $staffAvailability);

        $lesson->update([
            'title' => 'VIP '.strtoupper((string) $validated['level']),
            'starts_at' => $startsAt,
            'ends_at' => $endsAt,
            'level' => $validated['level'],
            'modality' => 'vip',
            'max_slots' => (int) $availability['max_capacity'],
            'max_capacity' => (int) $availability['max_capacity'],
            'location' => (string) ($validated['location'] ?? 'Zurriola'),
            'price' => 0.0,
            'currency' => 'EUR',
            'internal_notes' => 'VIP_CREDIT_COST=1',
        ]);

        $this->syncVipStaffAssignments($lesson, $validated);
        $this->rebalanceVipCapacitiesForDate($startsAt);

        return back()->with('success', 'Clase VIP actualizada correctamente.');
    }

    public function destroy(Lesson $lesson)
    {
        abort_unless((string) $lesson->modality === 'vip', 403, 'Solo se pueden borrar clases VIP en este panel.');

        DB::transaction(function () use ($lesson): void {
            $enrollments = LessonUser::query()
                ->where('lesson_id', $lesson->id)
                ->whereIn('status', self::ACTIVE_ENROLLMENT_STATUSES)
                ->get(['id', 'user_id', 'status']);

            $affectedUserIds = $enrollments->pluck('user_id')->unique()->values()->all();
            if (! empty($affectedUserIds)) {
                Log::warning('[VIP_MANAGER] Clase VIP eliminada con alumnos afectados', [
                    'lesson_id' => $lesson->id,
                    'affected_users' => $affectedUserIds,
                    'virtual_credit_refund_uc' => 1,
                    'at' => BusinessDateTime::now()->toDateTimeString(),
                ]);
            }

            $startsAt = $lesson->starts_at;
            LessonUser::query()->where('lesson_id', $lesson->id)->delete();
            StaffAssignment::query()->where('lesson_id', $lesson->id)->delete();
            $lesson->delete();
            $this->rebalanceVipCapacitiesForDate($startsAt);
        });

        return back()->with('success', 'Clase VIP eliminada y consumos asociados revertidos.');
    }

    public function replicatePreviousWeek(Request $request): JsonResponse
    {
        $today = BusinessDateTime::now();
        $prevStart = $today->copy()->startOfWeek()->subWeek();
        $prevEnd = $today->copy()->startOfWeek()->subWeek()->endOfWeek();
        $targetStart = $today->copy()->startOfWeek();

        $previousLessons = Lesson::query()
            ->with(['staffAssignments'])
            ->where('modality', 'vip')
            ->whereBetween('starts_at', [$prevStart, $prevEnd])
            ->orderBy('starts_at')
            ->get();

        $created = 0;
        foreach ($previousLessons as $prevLesson) {
            $offsetDays = $prevLesson->starts_at->diffInDays($prevStart);
            $newStart = $targetStart->copy()
                ->addDays($offsetDays)
                ->setTime($prevLesson->starts_at->hour, $prevLesson->starts_at->minute);
            $newEnd = $newStart->copy()->addMinutes(90);
            $availability = $this->availabilityService->evaluate($newStart, $newEnd, 1, 0);
            if (! $availability['allowed']) {
                continue;
            }
            $rangeStart = BusinessDateTime::parseInAppTimezone((string) $availability['request_window_start']);
            $rangeEnd = BusinessDateTime::parseInAppTimezone((string) $availability['request_window_end']);

            $lesson = Lesson::create([
                'title' => $prevLesson->title,
                'starts_at' => $newStart,
                'ends_at' => $newEnd,
                'level' => $prevLesson->level,
                'type' => Lesson::TYPE_SURF,
                'modality' => 'vip',
                'max_slots' => (int) $availability['max_capacity'],
                'max_capacity' => (int) $availability['max_capacity'],
                'location' => (string) ($prevLesson->location ?? 'Zurriola'),
                'status' => Lesson::STATUS_SCHEDULED,
                'is_private' => false,
                'price' => 0.0,
                'currency' => 'EUR',
                'internal_notes' => 'VIP_CREDIT_COST=1',
            ]);

            $monitorAssignment = $prevLesson->staffAssignments->first(fn ($s) => $s->role === StaffAssignment::ROLE_MONITOR);
            $photographerAssignment = $prevLesson->staffAssignments->first(fn ($s) => $s->role === StaffAssignment::ROLE_FOTOGRAFO);
            $staffAvailability = $this->computeStaffAvailability($rangeStart, $rangeEnd, 0);
            $availableIds = collect($staffAvailability['available'])->pluck('id')->all();

            $payload = [
                'monitor_id' => ($monitorAssignment && in_array((int) $monitorAssignment->user_id, $availableIds, true))
                    ? (int) $monitorAssignment->user_id
                    : null,
                'has_photographer' => (bool) $photographerAssignment && in_array((int) $photographerAssignment->user_id, $availableIds, true),
                'photographer_id' => ($photographerAssignment && in_array((int) $photographerAssignment->user_id, $availableIds, true))
                    ? (int) $photographerAssignment->user_id
                    : null,
            ];
            $this->syncVipStaffAssignments($lesson, $payload);
            $created++;
        }

        $this->rebalanceVipCapacitiesForDate(BusinessDateTime::now());

        return response()->json([
            'created' => $created,
            'source_lessons' => (int) $previousLessons->count(),
        ]);
    }

    private function syncVipStaffAssignments(Lesson $lesson, array $validated): void
    {
        if (! empty($validated['monitor_id'])) {
            StaffAssignment::updateOrCreate(
                ['lesson_id' => $lesson->id, 'role' => StaffAssignment::ROLE_MONITOR],
                ['user_id' => (int) $validated['monitor_id']]
            );
        } else {
            StaffAssignment::query()
                ->where('lesson_id', $lesson->id)
                ->where('role', StaffAssignment::ROLE_MONITOR)
                ->delete();
        }

        if (! empty($validated['has_photographer']) && ! empty($validated['photographer_id'])) {
            StaffAssignment::updateOrCreate(
                ['lesson_id' => $lesson->id, 'role' => StaffAssignment::ROLE_FOTOGRAFO],
                ['user_id' => (int) $validated['photographer_id']]
            );
        } else {
            StaffAssignment::query()
                ->where('lesson_id', $lesson->id)
                ->where('role', StaffAssignment::ROLE_FOTOGRAFO)
                ->delete();
        }
    }

    private function buildStaffCatalog()
    {
        return User::query()
            ->where('role', 'admin')
            ->orderBy('nombre')
            ->get(['id', 'nombre', 'apellido'])
            ->map(fn (User $u) => [
                'id' => (int) $u->id,
                'name' => trim((string) (($u->nombre ?? '').' '.($u->apellido ?? ''))),
            ])
            ->values();
    }

    private function computeStaffAvailability(Carbon $rangeStart, Carbon $rangeEnd, int $excludeLessonId = 0): array
    {
        $staff = $this->buildStaffCatalog();
        $busyAssignments = StaffAssignment::query()
            ->whereHas('lesson', function ($q) use ($rangeStart, $rangeEnd, $excludeLessonId) {
                $q->where('status', '!=', Lesson::STATUS_CANCELLED)
                    ->when($excludeLessonId > 0, fn ($sq) => $sq->where('id', '!=', $excludeLessonId))
                    ->where('starts_at', '<', $rangeEnd)
                    ->where('ends_at', '>', $rangeStart);
            })
            ->get(['user_id'])
            ->pluck('user_id')
            ->unique()
            ->map(fn ($id) => (int) $id)
            ->all();

        $available = [];
        $occupied = [];
        foreach ($staff as $person) {
            if (in_array((int) $person['id'], $busyAssignments, true)) {
                $occupied[] = ['id' => (int) $person['id'], 'name' => $person['name'], 'status' => 'occupied'];
            } else {
                $available[] = ['id' => (int) $person['id'], 'name' => $person['name'], 'status' => 'available'];
            }
        }

        return ['available' => $available, 'occupied' => $occupied];
    }

    private function assertSelectedStaffIsAvailable(array $validated, array $staffAvailability): void
    {
        $availableIds = collect($staffAvailability['available'] ?? [])->pluck('id')->map(fn ($id) => (int) $id)->all();
        $monitorId = (int) ($validated['monitor_id'] ?? 0);
        if ($monitorId > 0 && ! in_array($monitorId, $availableIds, true)) {
            abort(422, 'El monitor seleccionado está ocupado en la franja de 120 minutos.');
        }
        $photographerId = (int) ($validated['photographer_id'] ?? 0);
        if ($photographerId > 0 && ! in_array($photographerId, $availableIds, true)) {
            abort(422, 'El fotógrafo seleccionado está ocupado en la franja de 120 minutos.');
        }
    }

    private function parseVipFormDateTime(string $date, string $time): Carbon
    {
        return BusinessDateTime::parseInAppTimezone($date.' '.$time);
    }

    private function isCalendarDayBeforeTodayInMadrid(Carbon $startsAt): bool
    {
        $today = BusinessDateTime::today();
        $day = $startsAt->copy()->timezone(BusinessDateTime::businessTimezone())->startOfDay();

        return $day->lt($today);
    }

    /**
     * Impide pasar una clase que aún es hoy o futura a un día ya cerrado; se sigue pudiendo editar clases históricas.
     */
    private function wouldMoveFutureLessonToPastDay(Lesson $lesson, Carbon $newStartsAt): bool
    {
        $today = BusinessDateTime::today();
        $newDay = $newStartsAt->copy()->timezone(BusinessDateTime::businessTimezone())->startOfDay();
        if ($newDay->gte($today)) {
            return false;
        }
        $oldDay = $lesson->starts_at->copy()->timezone(BusinessDateTime::businessTimezone())->startOfDay();

        return $oldDay->gte($today);
    }

    private function isQuarterMinute(Carbon $value): bool
    {
        return ((int) $value->minute % 15) === 0;
    }

    private function rebalanceVipCapacitiesForDate(Carbon $date): void
    {
        $start = $date->copy()->startOfDay();
        $end = $date->copy()->endOfDay();

        Lesson::query()
            ->where('modality', 'vip')
            ->where('status', Lesson::STATUS_SCHEDULED)
            ->whereBetween('starts_at', [$start, $end])
            ->get(['id', 'starts_at', 'ends_at', 'max_slots', 'max_capacity'])
            ->each(function (Lesson $lesson): void {
                $evaluation = $this->availabilityService->evaluate($lesson->starts_at, $lesson->ends_at, 1, (int) $lesson->id);
                $capacity = (int) ($evaluation['max_capacity'] ?? 0);
                if ((int) ($lesson->max_slots ?? 0) !== $capacity || (int) ($lesson->max_capacity ?? 0) !== $capacity) {
                    $lesson->update([
                        'max_slots' => $capacity,
                        'max_capacity' => $capacity,
                    ]);
                }
            });
    }
}
