<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Lesson;
use App\Models\LessonUser;
use App\Models\StaffAssignment;
use App\Models\User;
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

    public function index(Request $request)
    {
        $month = (string) $request->query('month', now()->format('Y-m'));
        [$year, $m] = array_pad(array_map('intval', explode('-', $month)), 2, 0);
        if ($year < 2000 || $m < 1 || $m > 12) {
            $year = (int) now()->format('Y');
            $m = (int) now()->format('m');
            $month = sprintf('%04d-%02d', $year, $m);
        }

        $start = Carbon::create($year, $m, 1)->startOfMonth()->startOfDay();
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
                $capacity = (int) ($lesson->max_capacity ?? $lesson->max_slots ?? 0);
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
                    'starts_at' => $lesson->starts_at?->toIso8601String(),
                    'ends_at' => $lesson->ends_at?->toIso8601String(),
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
            'exclude_lesson_id' => 'nullable|integer|exists:lessons,id',
        ]);

        [$rangeStart, $rangeEnd] = $this->resolveWindow($validated['date'], $validated['time']);
        $excludeLessonId = (int) ($validated['exclude_lesson_id'] ?? 0);
        $availability = $this->computeAvailability($rangeStart, $rangeEnd, $excludeLessonId);
        $staffAvailability = $this->computeStaffAvailability($rangeStart, $rangeEnd, $excludeLessonId);

        return response()->json([
            'range_start' => $rangeStart->toIso8601String(),
            'range_end' => $rangeEnd->toIso8601String(),
            'overlapping_classes' => $availability['overlapping_classes'],
            'max_capacity' => $availability['max_capacity'],
            'is_staff_exhausted' => $availability['max_capacity'] === 0,
            'staff' => $staffAvailability,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'date' => 'required|date_format:Y-m-d',
            'time' => 'required|date_format:H:i',
            'level' => 'required|in:iniciacion,intermedio,avanzado',
            'monitor_id' => 'nullable|integer|exists:users,id',
            'has_photographer' => 'nullable|boolean',
            'photographer_id' => 'nullable|integer|exists:users,id',
            'location' => 'nullable|string|max:150',
            'max_capacity' => 'required|integer|in:0,6,12',
        ]);

        [$rangeStart, $rangeEnd] = $this->resolveWindow($validated['date'], $validated['time']);
        $availability = $this->computeAvailability($rangeStart, $rangeEnd, 0);
        $staffAvailability = $this->computeStaffAvailability($rangeStart, $rangeEnd, 0);
        if ($availability['max_capacity'] === 0) {
            return back()->withErrors(['time' => 'No se puede crear: no hay monitores disponibles en esa franja (15 min antes + 90 min + 15 min después).'])->withInput();
        }
        $this->assertSelectedStaffIsAvailable($validated, $staffAvailability);

        $startsAt = Carbon::parse($validated['date'].' '.$validated['time']);
        $endsAt = $startsAt->copy()->addMinutes(90);

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

        return back()->with('success', 'Clase VIP creada correctamente (consume 1 crédito por reserva).');
    }

    public function update(Request $request, Lesson $lesson)
    {
        abort_unless((string) $lesson->modality === 'vip', 403, 'Solo se pueden editar clases VIP en este panel.');

        $validated = $request->validate([
            'date' => 'required|date_format:Y-m-d',
            'time' => 'required|date_format:H:i',
            'level' => 'required|in:iniciacion,intermedio,avanzado',
            'monitor_id' => 'nullable|integer|exists:users,id',
            'has_photographer' => 'nullable|boolean',
            'photographer_id' => 'nullable|integer|exists:users,id',
            'location' => 'nullable|string|max:150',
            'max_capacity' => 'required|integer|in:0,6,12',
        ]);

        [$rangeStart, $rangeEnd] = $this->resolveWindow($validated['date'], $validated['time']);
        $availability = $this->computeAvailability($rangeStart, $rangeEnd, (int) $lesson->id);
        $staffAvailability = $this->computeStaffAvailability($rangeStart, $rangeEnd, (int) $lesson->id);
        if ($availability['overlapping_classes'] > 2) {
            return response()->json([
                'message' => 'Overbooking de staff: demasiadas clases en la franja seleccionada.',
            ], 422);
        }
        if ($availability['max_capacity'] === 0) {
            return response()->json([
                'message' => 'No se puede guardar: no hay monitores disponibles en esa franja (15 min antes + 90 min + 15 min después).',
            ], 422);
        }
        $this->assertSelectedStaffIsAvailable($validated, $staffAvailability);

        $startsAt = Carbon::parse($validated['date'].' '.$validated['time']);
        $endsAt = $startsAt->copy()->addMinutes(90);

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
                    'at' => now()->toDateTimeString(),
                ]);
            }

            LessonUser::query()->where('lesson_id', $lesson->id)->delete();
            StaffAssignment::query()->where('lesson_id', $lesson->id)->delete();
            $lesson->delete();
        });

        return back()->with('success', 'Clase VIP eliminada y consumos asociados revertidos.');
    }

    public function replicatePreviousWeek(Request $request): JsonResponse
    {
        $today = now();
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
            [$rangeStart, $rangeEnd] = [$newStart->copy()->subMinutes(15), $newStart->copy()->addMinutes(105)];
            $availability = $this->computeAvailability($rangeStart, $rangeEnd, 0);
            if ($availability['max_capacity'] === 0) {
                continue;
            }

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

    private function resolveWindow(string $date, string $time): array
    {
        $start = Carbon::parse($date.' '.$time);
        return [$start->copy()->subMinutes(15), $start->copy()->addMinutes(105)];
    }

    private function computeAvailability(Carbon $rangeStart, Carbon $rangeEnd, int $excludeLessonId = 0): array
    {
        $overlappingCount = Lesson::query()
            ->where('status', '!=', Lesson::STATUS_CANCELLED)
            ->when($excludeLessonId > 0, fn ($q) => $q->where('id', '!=', $excludeLessonId))
            ->where('starts_at', '<', $rangeEnd)
            ->where('ends_at', '>', $rangeStart)
            ->count();

        $maxCapacity = $overlappingCount >= 2 ? 0 : ($overlappingCount === 1 ? 6 : 12);

        return [
            'overlapping_classes' => (int) $overlappingCount,
            'max_capacity' => (int) $maxCapacity,
        ];
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
}

