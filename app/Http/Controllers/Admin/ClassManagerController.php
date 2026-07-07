<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Lesson;
use App\Models\LessonUser;
use App\Models\StaffAssignment;
use App\Models\User;
use App\Services\AvailabilityService;
use App\Support\BusinessDateTime;
use App\Support\StaffVisualIdentity;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class ClassManagerController extends Controller
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

    public function index(Request $request): InertiaResponse
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

        $selectedDay = $request->query('day');
        if (is_string($selectedDay) && ! preg_match('/^\d{4}-\d{2}-\d{2}$/', $selectedDay)) {
            $selectedDay = null;
        }

        $staffUsers = User::query()
            ->where('role', 'admin')
            ->orderBy('nombre')
            ->get(['id', 'nombre', 'apellido']);

        $staffPoolIds = $staffUsers->pluck('id')->map(fn ($id) => (int) $id)->values()->all();

        $staff = $staffUsers
            ->map(fn (User $u) => array_merge([
                'id' => (int) $u->id,
                'name' => trim((string) (($u->nombre ?? '').' '.($u->apellido ?? ''))),
            ], StaffVisualIdentity::forUser($u, $staffPoolIds)))
            ->values();

        $lessons = Lesson::query()
            ->with([
                'staffAssignments.user:id,nombre,apellido',
                'enrollments.user:id,nombre,apellido,telefono,email',
            ])
            ->where('status', '!=', Lesson::STATUS_CANCELLED)
            ->whereIn('modality', ['vip', 'grupal', 'semanal', 'particular'])
            ->whereBetween('starts_at', [$start, $end])
            ->orderBy('starts_at')
            ->get()
            ->map(fn (Lesson $lesson) => $this->mapLesson($lesson, $staffPoolIds))
            ->values();

        $monthStats = [
            'total' => $lessons->count(),
            'vip' => $lessons->where('modality', 'vip')->count(),
            'grupal' => $lessons->where('modality', 'grupal')->count(),
            'semanal' => $lessons->where('modality', 'semanal')->count(),
            'particular' => $lessons->where('modality', 'particular')->count(),
        ];

        return Inertia::render('Admin/ClassManager/Index', [
            'month' => $month,
            'selectedDay' => $selectedDay,
            'lessons' => $lessons,
            'staff' => $staff,
            'monthStats' => $monthStats,
        ]);
    }

    /** @param  list<int>  $staffPoolIds */
    private function mapLesson(Lesson $lesson, array $staffPoolIds = []): array
    {
        $modality = (string) ($lesson->modality ?: ($lesson->is_private ? 'particular' : 'grupal'));
        $monitor = $lesson->staffAssignments->first(fn ($s) => $s->role === StaffAssignment::ROLE_MONITOR);
        $monitor2 = $lesson->staffAssignments->first(fn ($s) => $s->role === StaffAssignment::ROLE_MONITOR_SECOND);
        $photographer = $lesson->staffAssignments->first(fn ($s) => $s->role === StaffAssignment::ROLE_FOTOGRAFO);

        $activeEnrollments = $lesson->enrollments->whereIn('status', self::ACTIVE_ENROLLMENT_STATUSES);

        $occupancyEnrollments = $activeEnrollments->where(
            'status',
            '!=',
            LessonUser::STATUS_PENDING_EXTRA_MONITOR
        );

        $occupancy = $modality === 'vip'
            ? $occupancyEnrollments->count()
            : (int) $occupancyEnrollments->sum(fn (LessonUser $e) => (int) ($e->party_size ?? $e->quantity ?? 1));

        $projectedPartySize = $this->availabilityService->effectivePartySizeForLesson(
            $occupancy,
            (int) ($lesson->max_slots ?? $lesson->max_capacity ?? 6)
        );
        $evaluation = $this->availabilityService->preview(
            $lesson->starts_at,
            $lesson->ends_at,
            $projectedPartySize,
            (int) $lesson->id
        );
        $staffStatus = $this->availabilityService->describeCapacity($evaluation);
        $poolMax = (int) ($evaluation['max_capacity'] ?? 0);
        $configuredMax = (int) ($lesson->max_slots ?? $lesson->max_capacity ?? 6);

        $capacity = min($configuredMax, $poolMax);

        $isEnrollmentFull = $capacity > 0 && $occupancy >= $capacity;

        $students = $activeEnrollments
            ->map(fn (LessonUser $enrollment) => $enrollment->displayName())
            ->filter()
            ->values()
            ->all();

        $enrollments = $activeEnrollments
            ->map(fn (LessonUser $enrollment) => $this->mapEnrollment($enrollment))
            ->values()
            ->all();

        $bookerName = trim((string) (($lesson->booker_first_name ?? '').' '.($lesson->booker_last_name ?? '')));

        $monitorVisual = StaffVisualIdentity::forUser($monitor?->user, $staffPoolIds);
        $monitor2Visual = StaffVisualIdentity::forUser($monitor2?->user, $staffPoolIds);
        $photographerVisual = StaffVisualIdentity::forUser($photographer?->user, $staffPoolIds);

        $monitors = collect([$monitor, $monitor2])
            ->filter()
            ->map(function (StaffAssignment $assignment) use ($staffPoolIds) {
                $visual = StaffVisualIdentity::forUser($assignment->user, $staffPoolIds);

                return [
                    'id' => (int) $assignment->user_id,
                    'name' => trim((string) (($assignment->user?->nombre ?? '').' '.($assignment->user?->apellido ?? ''))),
                    'initials' => $visual['initials'],
                    'color' => $visual['color'],
                    'text_color' => $visual['text_color'],
                ];
            })
            ->values()
            ->all();

        return [
            'id' => (int) $lesson->id,
            'title' => $lesson->title ?: ($modality === 'vip' ? 'Clase VIP' : 'Clase de surf'),
            'modality' => $modality,
            'starts_at' => $lesson->starts_at ? BusinessDateTime::toApi($lesson->starts_at) : null,
            'ends_at' => $lesson->ends_at ? BusinessDateTime::toApi($lesson->ends_at) : null,
            'level' => $lesson->level,
            'location' => $lesson->location ?: 'Zurriola',
            'status' => $lesson->status,
            'batch_id' => $lesson->batch_id,
            'is_private' => (bool) ($lesson->is_private ?? false),
            'is_surf_trip' => (bool) $lesson->is_surf_trip,
            'is_optimal_waves' => (bool) $lesson->is_optimal_waves,
            'occupancy' => $occupancy,
            'max_capacity' => $capacity,
            'is_enrollment_full' => $isEnrollmentFull,
            'requires_two_monitors' => $configuredMax >= 7,
            'staff_pool_max_capacity' => $poolMax,
            'monitors_free' => (int) $staffStatus['monitors_free'],
            'staff_capacity_status' => (string) $staffStatus['status'],
            'staff_capacity_label' => (string) $staffStatus['label'],
            'staff_capacity_message' => (string) $staffStatus['message'],
            'staff_capacity_show_warning' => (bool) $staffStatus['show_warning'],
            'monitor_id' => $monitor?->user_id ? (int) $monitor->user_id : null,
            'monitor_2_id' => $monitor2?->user_id ? (int) $monitor2->user_id : null,
            'photographer_id' => $photographer?->user_id ? (int) $photographer->user_id : null,
            'has_photographer' => (bool) $photographer,
            'monitors' => $monitors,
            'monitor_name' => trim((string) (($monitor?->user?->nombre ?? '').' '.($monitor?->user?->apellido ?? ''))),
            'monitor_2_name' => trim((string) (($monitor2?->user?->nombre ?? '').' '.($monitor2?->user?->apellido ?? ''))),
            'photographer_name' => trim((string) (($photographer?->user?->nombre ?? '').' '.($photographer?->user?->apellido ?? ''))),
            'monitor_initials' => $monitorVisual['initials'],
            'monitor_color' => $monitorVisual['color'],
            'monitor_text_color' => $monitorVisual['text_color'],
            'monitor_2_initials' => $monitor2Visual['initials'],
            'monitor_2_color' => $monitor2Visual['color'],
            'monitor_2_text_color' => $monitor2Visual['text_color'],
            'photographer_initials' => $photographerVisual['initials'],
            'photographer_color' => $photographerVisual['color'],
            'photographer_text_color' => $photographerVisual['text_color'],
            'students' => $students,
            'enrollments' => $enrollments,
            'booker_name' => $bookerName !== '' ? $bookerName : null,
            'booker_first_name' => $lesson->booker_first_name,
            'booker_last_name' => $lesson->booker_last_name,
            'booker_phone' => $lesson->booker_phone,
        ];
    }

    /** @return array<string, mixed> */
    private function mapEnrollment(LessonUser $enrollment): array
    {
        $firstName = trim((string) ($enrollment->guest_first_name ?? ''));
        $lastName = trim((string) ($enrollment->guest_last_name ?? ''));
        if ($firstName === '' && $enrollment->user) {
            $firstName = trim((string) ($enrollment->user->nombre ?? ''));
        }
        if ($lastName === '' && $enrollment->user) {
            $lastName = trim((string) ($enrollment->user->apellido ?? ''));
        }

        $phone = trim((string) ($enrollment->guest_phone ?? ''));
        if ($phone === '' && $enrollment->user) {
            $phone = trim((string) ($enrollment->user->telefono ?? ''));
        }

        $email = trim((string) ($enrollment->guest_email ?? ''));
        if ($email === '' && $enrollment->user) {
            $email = trim((string) ($enrollment->user->email ?? ''));
        }

        return [
            'id' => (int) $enrollment->id,
            'is_admin_guest' => (bool) $enrollment->is_admin_guest,
            'name' => $enrollment->displayName() ?: '—',
            'first_name' => $firstName !== '' ? $firstName : null,
            'last_name' => $lastName !== '' ? $lastName : null,
            'phone' => $phone !== '' ? $phone : null,
            'email' => $email !== '' ? $email : null,
            'payment_status' => (string) ($enrollment->payment_status ?? LessonUser::PAYMENT_PENDING),
            'party_size' => (int) ($enrollment->party_size ?? 1),
            'status' => (string) $enrollment->status,
            'is_quota_pending' => $enrollment->status === LessonUser::STATUS_PENDING_EXTRA_MONITOR,
        ];
    }
}
