<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Academy\AdminGuestEnrollmentAction;
use App\Actions\Academy\SyncLessonStaffAction;
use App\DTOs\Academy\AdminGuestEnrollmentDto;
use App\Http\Controllers\Controller;
use App\Mail\ReservationConfirmedMail;
use App\Models\Booking;
use App\Models\Lesson;
use App\Models\LessonUser;
use App\Models\StaffAssignment;
use App\Models\User;
use App\Models\UserBono;
use App\Services\Payments\PaymentReceiptAccessService;
use App\Services\AutoReleaseService;
use App\Services\AvailabilityService;
use App\Support\AcademyContact;
use App\Support\BusinessDateTime;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;

class AcademyController extends Controller
{
    public function __construct(
        protected AutoReleaseService $autoReleaseService,
        protected AvailabilityService $availabilityService,
        protected AdminGuestEnrollmentAction $guestEnrollmentAction,
        protected SyncLessonStaffAction $syncLessonStaffAction,
        protected PaymentReceiptAccessService $paymentReceipts,
    ) {
        Cache::remember('auto_cleanup_check', 900, function () {
            return $this->autoReleaseService->cleanupExpiredReservations();
        });
    }

    /**
     * Gestor de Comprobaciones (clases + alquileres) para auditoría financiera.
     */
    public function checkManager(Request $request)
    {
        $googleMapsUrl = config('services.academy.maps_url');
        $status = $request->query('status', 'all'); // all|pending|confirmed|rejected
        $validStatuses = ['all', 'pending', 'confirmed', 'rejected'];
        if (! in_array($status, $validStatuses, true)) {
            $status = 'all';
        }

        $lessons = LessonUser::query()
            ->with([
                'user',
                'lesson.staffAssignments.user',
                'lesson.enrollments',
            ])
            ->when($status !== 'all', fn ($q) => $q->where('payment_status', $status))
            ->orderByDesc('created_at')
            ->limit(300)
            ->get()
            ->map(function (LessonUser $e) use ($googleMapsUrl) {
                $notes = (string) ($e->admin_notes ?? '');
                $manualStore = str_contains(Str::lower($notes), 'pago manual realizado por admin en tienda');
                $digital = ! $manualStore && ! empty($e->payment_proof_path) && ($e->payment_status === LessonUser::PAYMENT_CONFIRMED);
                $method = $manualStore ? 'tienda' : ($digital ? 'digital' : null);
                $emailStatus = str_contains($notes, '[email_sent]')
                    ? 'sent'
                    : (str_contains($notes, '[email_error]') ? 'error' : null);
                $emailError = null;
                if (preg_match('/\[email_error:([^\]]+)\]/', $notes, $m)) {
                    $emailError = trim($m[1]);
                }

                $monitor = $e->lesson?->staffAssignments
                    ?->first(fn ($s) => ($s->role ?? null) === 'monitor' && $s->user)
                    ?->user;
                $monitorName = $monitor ? ($monitor->nombre ?? $monitor->name) : null;
                $level = $e->lesson?->level;
                $levelNameMap = [
                    Lesson::LEVEL_INICIACION => 'Iniciación',
                    Lesson::LEVEL_INTERMEDIO => 'Intermedio',
                    Lesson::LEVEL_AVANZADO => 'Avanzado',
                ];

                $totalStudents = (int) ($e->lesson?->enrollments
                    ?->whereIn('status', [
                        LessonUser::STATUS_PENDING_EXTRA_MONITOR,
                        LessonUser::STATUS_CONFIRMED,
                        LessonUser::STATUS_ENROLLED,
                        LessonUser::STATUS_ATTENDED,
                    ])
                    ->sum(fn ($en) => (int) ($en->quantity ?? $en->party_size ?? 1)) ?? 0);
                $maxSlots = (int) ($e->lesson?->max_slots ?? 6);
                $requiresSecondMonitor = $totalStudents > 6 || $e->status === LessonUser::STATUS_PENDING_EXTRA_MONITOR;
                $waText = '¡Hola! Tenemos una solicitud de ampliación para la clase de '.($e->lesson?->starts_at?->locale('es')->translatedFormat('d/m/Y H:i') ?? 'fecha pendiente').'. Grupo de '.(int) ($e->quantity ?? $e->party_size ?? 1).' personas ('.($levelNameMap[$level] ?? ucfirst((string) $level)).'). ¿Confirmamos segundo monitor?';

                return [
                    'id' => $e->id,
                    'enrollment_id' => $e->id,
                    'user_id' => $e->user_id,
                    'user' => $e->user ? ($e->user->nombre ?? $e->user->name ?? $e->user->email) : '—',
                    'user_email' => $e->user?->email,
                    'enrollment_status' => $e->status,
                    'date' => $e->lesson?->starts_at ? BusinessDateTime::toApi($e->lesson->starts_at) : null,
                    'date_human' => $e->lesson?->starts_at?->locale('es')->translatedFormat('l, d \\d\\e F'),
                    'time_human' => $e->lesson?->starts_at?->format('H:i'),
                    'phone' => $e->user?->telefono,
                    'amount' => $e->lesson?->price !== null ? (float) $e->lesson->price : 20.0,
                    'lesson_name' => $e->lesson?->title ?: 'Clase de Surf',
                    'level_name' => $level ? ($levelNameMap[$level] ?? ucfirst($level)) : null,
                    'monitor_name' => $monitorName,
                    'total_students' => $totalStudents,
                    'max_slots' => $maxSlots,
                    'requires_second_monitor' => $requiresSecondMonitor,
                    'occupancy_label' => "{$totalStudents}/{$maxSlots}".($requiresSecondMonitor ? ' (Requiere 2º Monitor)' : ''),
                    'extra_monitor_whatsapp_url' => $requiresSecondMonitor ? AcademyContact::whatsappUrl($waText) : null,
                    'email_status' => $emailStatus,
                    'email_error' => $emailError,
                    'google_maps_url' => $googleMapsUrl,
                    'method' => $method,
                    'payment_method' => $method,
                    'status' => $e->payment_status ?? LessonUser::PAYMENT_PENDING,
                    'proof_url' => ! empty($e->payment_proof_path) ? route('admin.academy.enrollments.proof', $e->id) : null,
                    'admin_notes' => $e->admin_notes,
                ];
            })
            ->values();

        $rentals = Booking::query()
            ->with(['user', 'surfboard'])
            ->when($status !== 'all', fn ($q) => $q->where('payment_status', $status))
            ->orderByDesc('created_at')
            ->limit(300)
            ->get()
            ->map(function (Booking $b) use ($googleMapsUrl) {
                $notes = (string) ($b->admin_notes ?? '');
                $manualStore = str_contains(Str::lower($notes), 'pago manual');
                $digital = ! $manualStore && ! empty($b->payment_proof_path) && ($b->payment_status === Booking::PAYMENT_CONFIRMED);
                $method = $manualStore ? 'tienda' : ($digital ? 'digital' : null);

                return [
                    'id' => $b->id,
                    'user' => $b->client_name ?: ($b->user?->nombre ?? $b->user?->name ?? $b->user?->email ?? '—'),
                    'date' => $b->start_date?->toIso8601String(),
                    'date_human' => $b->start_date?->locale('es')->translatedFormat('l, d \\d\\e F'),
                    'time_human' => $b->start_date?->format('H:i'),
                    'phone' => $b->phone ?: $b->user?->telefono,
                    'amount' => (float) $b->deposit_amount,
                    'lesson_name' => $b->surfboard?->name ? 'Alquiler · '.$b->surfboard->name : 'Alquiler',
                    'level_name' => null,
                    'monitor_name' => null,
                    'total_students' => 1,
                    'email_status' => null,
                    'email_error' => null,
                    'google_maps_url' => $googleMapsUrl,
                    'method' => $method,
                    'payment_method' => $method,
                    'status' => $b->payment_status ?? Booking::PAYMENT_PENDING,
                    'proof_url' => ! empty($b->payment_proof_path) ? route('admin.bookings.proof', $b->id) : null,
                    'admin_notes' => $b->admin_notes,
                    'surfboard' => $b->surfboard?->name,
                ];
            })
            ->values();

        $lessonCounts = [
            'all' => LessonUser::query()->count(),
            'pending' => LessonUser::query()->where('payment_status', LessonUser::PAYMENT_PENDING)->count(),
            'confirmed' => LessonUser::query()->where('payment_status', LessonUser::PAYMENT_CONFIRMED)->count(),
            'rejected' => LessonUser::query()->where('payment_status', LessonUser::PAYMENT_REJECTED)->count(),
        ];

        $rentalCounts = [
            'all' => Booking::query()->count(),
            'pending' => Booking::query()->where('payment_status', Booking::PAYMENT_PENDING)->count(),
            'confirmed' => Booking::query()->where('payment_status', Booking::PAYMENT_CONFIRMED)->count(),
            'rejected' => Booking::query()->where('payment_status', Booking::PAYMENT_REJECTED)->count(),
        ];

        $allRows = $lessons->concat($rentals);
        $totalTiendaEur = (float) $allRows
            ->filter(fn ($r) => ($r['payment_method'] ?? null) === 'tienda')
            ->sum(fn ($r) => (float) ($r['amount'] ?? 0));
        $totalDigitalEur = (float) $allRows
            ->filter(fn ($r) => ($r['payment_method'] ?? null) === 'digital')
            ->sum(fn ($r) => (float) ($r['amount'] ?? 0));

        $weeklyHealth = $this->buildWeeklyHealthSummary();

        return Inertia::render('Admin/CheckManager', [
            'filters' => ['status' => $status],
            'lessonRows' => $lessons,
            'rentalRows' => $rentals,
            'counts' => [
                'lessons' => $lessonCounts,
                'rentals' => $rentalCounts,
                'pendingCount' => ($lessonCounts['pending'] ?? 0) + ($rentalCounts['pending'] ?? 0),
            ],
            'totals' => [
                'total_tienda_eur' => $totalTiendaEur,
                'total_digital_eur' => $totalDigitalEur,
            ],
            'googleMapsUrl' => $googleMapsUrl,
            'weeklyHealth' => $weeklyHealth,
        ]);
    }

    /**
     * Check de disponibilidad para modal de creación (Commander).
     */
    public function checkAvailability(Request $request)
    {
        $validated = $request->validate([
            'date' => 'required|date_format:Y-m-d',
            'time' => 'required|date_format:H:i',
            'duration_minutes' => 'nullable|integer|in:60,90',
            'projected_party_size' => 'nullable|integer|min:1|max:12',
            'exclude_lesson_id' => 'nullable|integer|exists:lessons,id',
        ]);

        $startsAt = BusinessDateTime::parseInAppTimezone($validated['date'].' '.$validated['time']);
        $durationMinutes = (int) ($validated['duration_minutes'] ?? 90);
        $endsAt = $startsAt->copy()->addMinutes($durationMinutes);

        if (! $this->isQuarterMinute($startsAt) || ! $this->isQuarterMinute($endsAt)) {
            return response()->json([
                'max_capacity' => 0,
                'message' => 'Las horas deben estar en intervalos de 15 minutos (:00, :15, :30, :45).',
            ], 422);
        }

        if ($durationMinutes < 60) {
            return response()->json([
                'max_capacity' => 0,
                'message' => 'La duración mínima de una sesión es de 1 hora.',
            ], 422);
        }

        $configuredMax = (int) ($validated['projected_party_size'] ?? 1);
        $projectedPartySize = $this->availabilityService->effectivePartySizeForLesson(0, $configuredMax);
        $excludeLessonId = (int) ($validated['exclude_lesson_id'] ?? 0);
        $evaluation = $this->availabilityService->preview($startsAt, $endsAt, $projectedPartySize, $excludeLessonId);
        $staffStatus = $this->availabilityService->describeCapacity($evaluation);
        $hasConflict = ! $evaluation['allowed'] || (int) $evaluation['max_capacity'] === 0;
        $conflictDetail = $hasConflict ? $this->availabilityService->buildConflictPayload($evaluation) : null;

        $payload = [
            'max_capacity' => (int) $evaluation['max_capacity'],
            'peak_monitors_used' => (int) ($evaluation['peak_monitors_used'] ?? 0),
            'monitors_free' => (int) $staffStatus['monitors_free'],
            'staff_capacity_status' => (string) $staffStatus['status'],
            'occupied_lesson_ids' => $evaluation['occupied_lesson_ids'] ?? [],
            'conflicts' => $evaluation['conflicts'] ?? [],
            'range_start' => $evaluation['request_window_start'],
            'range_end' => $evaluation['request_window_end'],
            'is_staff_exhausted' => (int) $evaluation['max_capacity'] === 0,
            'allowed' => (bool) $evaluation['allowed'],
            'conflict_detail' => $conflictDetail,
            'message' => $hasConflict
                ? (string) ($conflictDetail['summary'] ?? 'Conflicto de monitores.')
                : ($staffStatus['show_warning'] ? (string) $staffStatus['message'] : null),
        ];

        return response()->json($payload, $hasConflict ? 422 : 200);
    }

    /**
     * Dashboard global de pagos (Clases + Alquileres + Bonos VIP).
     */
    public function globalPaymentsDashboard(Request $request)
    {
        $status = $request->query('status', 'all'); // all|pending|confirmed|rejected
        $validStatuses = ['all', 'pending', 'confirmed', 'rejected'];
        if (! in_array($status, $validStatuses, true)) {
            $status = 'all';
        }

        $bonoStatus = $request->query('bono_status', 'all'); // all|pending_validation|pending_payment|confirmed|rejected
        $validBonoStatuses = ['all', 'pending_validation', 'pending_payment', 'confirmed', 'rejected'];
        if (! in_array($bonoStatus, $validBonoStatuses, true)) {
            $bonoStatus = 'all';
        }

        $bonoPackId = $request->query('bono_pack_id');
        $bonoPackId = is_numeric($bonoPackId) ? (int) $bonoPackId : null;
        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');
        $startDate = is_string($startDate) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $startDate) ? $startDate : null;
        $endDate = is_string($endDate) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $endDate) ? $endDate : null;

        $lessonEntities = LessonUser::query()
            ->with(['user', 'lesson'])
            ->when($status !== 'all', fn ($q) => $q->where('payment_status', $status))
            ->when($startDate, fn ($q) => $q->whereDate('created_at', '>=', $startDate))
            ->when($endDate, fn ($q) => $q->whereDate('created_at', '<=', $endDate))
            ->orderByDesc('created_at')
            ->limit(400)
            ->get();

        $rentalEntities = Booking::query()
            ->with(['user', 'surfboard'])
            ->when($status !== 'all', fn ($q) => $q->where('payment_status', $status))
            ->when($startDate, fn ($q) => $q->whereDate('created_at', '>=', $startDate))
            ->when($endDate, fn ($q) => $q->whereDate('created_at', '<=', $endDate))
            ->orderByDesc('created_at')
            ->limit(400)
            ->get();

        $bonoEntities = UserBono::query()
            ->with(['user:id,nombre,apellido,email,telefono', 'pack:id,nombre,num_clases,precio'])
            ->when($bonoPackId, fn ($q) => $q->where('pack_id', $bonoPackId))
            ->when($startDate, fn ($q) => $q->whereDate('created_at', '>=', $startDate))
            ->when($endDate, fn ($q) => $q->whereDate('created_at', '<=', $endDate))
            ->when($bonoStatus === 'confirmed', fn ($q) => $q->where('status', UserBono::STATUS_CONFIRMED))
            ->when($bonoStatus === 'rejected', fn ($q) => $q->where('status', UserBono::STATUS_REJECTED))
            ->when($bonoStatus === 'pending_validation', function ($q) {
                $q->where('status', UserBono::STATUS_PENDING)
                    ->whereNotNull('payment_proof_path');
            })
            ->when($bonoStatus === 'pending_payment', function ($q) {
                $q->where('status', UserBono::STATUS_PENDING)
                    ->whereNull('payment_proof_path');
            })
            ->orderByDesc('created_at')
            ->limit(300)
            ->get();

        $receiptMap = $this->paymentReceipts->proofMetaMapForPayables(array_merge(
            $lessonEntities->map(fn (LessonUser $e) => ['type' => LessonUser::class, 'id' => (int) $e->id])->all(),
            $rentalEntities->map(fn (Booking $b) => ['type' => Booking::class, 'id' => (int) $b->id])->all(),
            $bonoEntities->map(fn (UserBono $b) => ['type' => UserBono::class, 'id' => (int) $b->id])->all(),
        ));

        $lessonRows = $lessonEntities
            ->map(function (LessonUser $e) use ($receiptMap) {
                $paymentStatus = $e->payment_status ?? LessonUser::PAYMENT_PENDING;
                $reviewedAt = $e->reviewed_at?->toIso8601String();
                $createdAt = $e->created_at?->toIso8601String();
                $manualProofUrl = ! empty($e->payment_proof_path) ? route('admin.academy.enrollments.proof', $e->id) : null;
                $proof = $this->paymentReceipts->proofFieldsForPayable(
                    LessonUser::class,
                    (int) $e->id,
                    ! empty($e->payment_proof_path),
                    $manualProofUrl,
                    $receiptMap,
                );

                return [
                    'id' => $e->id,
                    'entity' => 'class',
                    'user_name' => $e->user ? ($e->user->nombre ?? $e->user->name ?? $e->user->email) : '—',
                    'user' => $e->user ? ($e->user->nombre ?? $e->user->name ?? $e->user->email) : '—',
                    'email' => $e->user?->email,
                    'phone' => $e->user?->telefono,
                    'status' => $paymentStatus,
                    'enrollment_status' => $e->status,
                    'lesson_status' => $e->lesson?->status,
                    'refund_status' => $this->resolveEnrollmentRefundStatus($e, $e->lesson),
                    'is_new' => $reviewedAt === null,
                    'reviewed_at' => $reviewedAt,
                    'created_at' => $createdAt,
                    'created_at_human' => $this->dashboardCreatedAtHuman($e->created_at),
                    'proof_url' => $proof['proof_url'],
                    'proof_is_stripe_receipt' => $proof['proof_is_stripe_receipt'],
                    'payment_method' => $e->payment_method,
                    'is_stripe_automated' => ($e->payment_method ?? '') === 'card',
                    'amount' => $e->lesson?->price !== null ? (float) $e->lesson->price : 20.0,
                    'lesson_name' => $e->lesson?->title ?: 'Clase de Surf',
                    'modality' => $e->lesson?->modality ?: 'grupal',
                    'date' => $e->lesson?->starts_at ? BusinessDateTime::toApi($e->lesson->starts_at) : null,
                    'date_human' => $e->lesson?->starts_at?->locale('es')->translatedFormat('d/m/Y'),
                    'admin_notes' => $e->admin_notes,
                ];
            })
            ->values();

        $rentalRows = $rentalEntities
            ->map(function (Booking $b) use ($receiptMap) {
                $paymentStatus = $b->payment_status ?? Booking::PAYMENT_PENDING;
                $reviewedAt = $b->reviewed_at?->toIso8601String();
                $createdAt = $b->created_at?->toIso8601String();
                $manualProofUrl = ! empty($b->payment_proof_path) ? route('admin.bookings.proof', $b->id) : null;
                $proof = $this->paymentReceipts->proofFieldsForPayable(
                    Booking::class,
                    (int) $b->id,
                    ! empty($b->payment_proof_path),
                    $manualProofUrl,
                    $receiptMap,
                );

                return [
                    'id' => $b->id,
                    'entity' => 'rental',
                    'user_name' => $b->client_name ?: ($b->user?->nombre ?? $b->user?->name ?? $b->user?->email ?? '—'),
                    'user' => $b->client_name ?: ($b->user?->nombre ?? $b->user?->name ?? $b->user?->email ?? '—'),
                    'email' => $b->user?->email,
                    'phone' => $b->phone ?: $b->user?->telefono,
                    'status' => $paymentStatus,
                    'refund_status' => $this->resolveBookingRefundStatus($b),
                    'is_new' => $reviewedAt === null,
                    'reviewed_at' => $reviewedAt,
                    'created_at' => $createdAt,
                    'created_at_human' => $this->dashboardCreatedAtHuman($b->created_at),
                    'proof_url' => $proof['proof_url'],
                    'proof_is_stripe_receipt' => $proof['proof_is_stripe_receipt'],
                    'payment_method' => $b->payment_method,
                    'is_stripe_automated' => ($b->payment_method ?? '') === 'card',
                    'amount' => (float) ($b->total_price ?? 0),
                    'deposit_amount' => (float) ($b->deposit_amount ?? 0),
                    'booking_status' => $b->status,
                    'rental_name' => $b->surfboard?->name ? 'Alquiler · '.$b->surfboard->name : 'Alquiler',
                    'date' => $b->start_date?->toIso8601String(),
                    'date_human' => $b->start_date?->locale('es')->translatedFormat('d/m/Y'),
                    'admin_notes' => $b->admin_notes,
                ];
            })
            ->values();

        $bonoRows = $bonoEntities
            ->map(function (UserBono $row) use ($receiptMap) {
                $reviewedAt = $row->reviewed_at?->toIso8601String();
                $manualProofUrl = $row->payment_proof_path ? Storage::url($row->payment_proof_path) : null;
                $proof = $this->paymentReceipts->proofFieldsForPayable(
                    UserBono::class,
                    (int) $row->id,
                    ! empty($row->payment_proof_path),
                    $manualProofUrl,
                    $receiptMap,
                );

                return [
                    'id' => $row->id,
                    'entity' => 'bono',
                    'user_name' => $row->user ? trim(($row->user->nombre ?? '').' '.($row->user->apellido ?? '')) : '—',
                    'user' => $row->user ? trim(($row->user->nombre ?? '').' '.($row->user->apellido ?? '')) : '—',
                    'email' => $row->user?->email,
                    'phone' => $row->user?->telefono,
                    'status' => $row->status,
                    'is_new' => $reviewedAt === null,
                    'reviewed_at' => $reviewedAt,
                    'pack_id' => (int) $row->pack_id,
                    'pack' => $row->pack?->nombre,
                    'num_clases' => (int) ($row->pack?->num_clases ?? 0),
                    'amount' => (float) ($row->pack?->precio ?? 0),
                    'has_proof' => ! empty($row->payment_proof_path) || $proof['proof_url'] !== null,
                    'proof_url' => $proof['proof_url'],
                    'proof_is_stripe_receipt' => $proof['proof_is_stripe_receipt'],
                    'is_stripe_automated' => $row->status === UserBono::STATUS_PENDING && empty($row->payment_proof_path),
                    'created_at' => $row->created_at?->toIso8601String(),
                    'created_at_human' => $this->dashboardCreatedAtHuman($row->created_at),
                    'date_human' => $this->dashboardCreatedAtHuman($row->created_at),
                    'admin_notes' => $row->admin_notes,
                ];
            })
            ->values();

        $payments = collect()
            ->concat($lessonRows)
            ->concat($rentalRows)
            ->concat($bonoRows)
            ->sortByDesc(function (array $row) {
                return strtotime((string) ($row['created_at'] ?? ''));
            })
            ->values();

        $bonoPacks = \App\Models\PackBono::query()
            ->orderBy('nombre')
            ->get(['id', 'nombre', 'num_clases', 'activo'])
            ->map(fn ($p) => [
                'id' => (int) $p->id,
                'nombre' => $p->nombre,
                'num_clases' => (int) $p->num_clases,
                'activo' => (bool) $p->activo,
            ])
            ->values();

        return Inertia::render('Admin/Payments/GlobalDashboard', [
            'filters' => [
                'status' => $status,
                'bono_status' => $bonoStatus,
                'bono_pack_id' => $bonoPackId,
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
            'payments' => $payments,
            'bonoPacks' => $bonoPacks,
            'counts' => [
                'lessons' => [
                    'all' => LessonUser::query()->count(),
                    'pending' => LessonUser::query()->where('payment_status', LessonUser::PAYMENT_PENDING)->count(),
                    'confirmed' => LessonUser::query()->where('payment_status', LessonUser::PAYMENT_CONFIRMED)->count(),
                    'rejected' => LessonUser::query()->where('payment_status', LessonUser::PAYMENT_REJECTED)->count(),
                ],
                'rentals' => [
                    'all' => Booking::query()->count(),
                    'pending' => Booking::query()->where('payment_status', Booking::PAYMENT_PENDING)->count(),
                    'confirmed' => Booking::query()->where('payment_status', Booking::PAYMENT_CONFIRMED)->count(),
                    'rejected' => Booking::query()->where('payment_status', Booking::PAYMENT_REJECTED)->count(),
                ],
                'bonos' => [
                    'all' => UserBono::query()->count(),
                    'pending_validation' => UserBono::query()
                        ->where('status', UserBono::STATUS_PENDING)
                        ->whereNotNull('payment_proof_path')
                        ->count(),
                    'pending_payment' => UserBono::query()
                        ->where('status', UserBono::STATUS_PENDING)
                        ->whereNull('payment_proof_path')
                        ->count(),
                    'confirmed' => UserBono::query()->where('status', UserBono::STATUS_CONFIRMED)->count(),
                    'rejected' => UserBono::query()->where('status', UserBono::STATUS_REJECTED)->count(),
                ],
            ],
        ]);
    }

    /**
     * Marcar un pago como revisado en flujo administrativo (quita indicador visual no revisado).
     */
    public function markPaymentReviewed(Request $request)
    {
        $validated = $request->validate([
            'entity' => 'required|string|in:class,rental,bono',
            'id' => 'required|integer|min:1',
        ]);

        $now = BusinessDateTime::now();

        if ($validated['entity'] === 'class') {
            $row = LessonUser::query()->findOrFail($validated['id']);
            $row->update(['reviewed_at' => $now]);
        } elseif ($validated['entity'] === 'rental') {
            $row = Booking::query()->findOrFail($validated['id']);
            $row->update(['reviewed_at' => $now]);
        } else {
            $row = UserBono::query()->findOrFail($validated['id']);
            $row->update(['reviewed_at' => $now]);
        }

        return back()->with('success', 'Marca de pendiente retirada correctamente.');
    }

    /**
     * Actualiza el estado de devolución para clases/alquileres cancelados con pago confirmado.
     */
    public function updateRefundStatus(Request $request)
    {
        $validated = $request->validate([
            'entity' => 'required|string|in:class,rental',
            'id' => 'required|integer|min:1',
            'refund_status' => 'required|string|in:pending,completed',
        ]);

        if ($validated['entity'] === 'class') {
            $row = LessonUser::query()->with('lesson')->findOrFail($validated['id']);
            if (! $this->shouldTrackRefundForEnrollment($row, $row->lesson)) {
                return back()->with('error', 'La devolución no aplica para esta clase.');
            }
            $row->update([
                'refund_status' => $validated['refund_status'],
                'reviewed_at' => null,
            ]);
        } else {
            $row = Booking::query()->findOrFail($validated['id']);
            if (! $this->shouldTrackRefundForBooking($row)) {
                return back()->with('error', 'La devolución no aplica para este alquiler.');
            }
            $row->update([
                'refund_status' => $validated['refund_status'],
                'reviewed_at' => null,
            ]);
        }

        return back()->with('success', 'Estado de devolución actualizado.');
    }

    /**
     * Resumen rápido de salud semanal para dashboard operativo.
     */
    private function buildWeeklyHealthSummary(): array
    {
        $start = BusinessDateTime::now()->startOfWeek();
        $end = BusinessDateTime::now()->endOfWeek();

        $weekEnrollments = LessonUser::query()
            ->with('lesson:id,price,starts_at')
            ->whereHas('lesson', fn ($q) => $q->whereBetween('starts_at', [$start, $end]))
            ->get();

        $confirmedRevenue = (float) $weekEnrollments
            ->whereIn('status', [
                LessonUser::STATUS_CONFIRMED,
                LessonUser::STATUS_ENROLLED,
                LessonUser::STATUS_ATTENDED,
            ])
            ->sum(fn ($e) => (float) ($e->lesson?->price ?? 20) * (int) ($e->quantity ?? $e->party_size ?? 1));

        $lostRevenue = (float) $weekEnrollments
            ->where('status', LessonUser::STATUS_EXPIRED)
            ->sum(fn ($e) => (float) ($e->lesson?->price ?? 20) * (int) ($e->quantity ?? $e->party_size ?? 1));

        $emailTagged = $weekEnrollments->filter(function ($e) {
            $notes = (string) ($e->admin_notes ?? '');

            return str_contains($notes, '[email_sent]') || str_contains($notes, '[email_error');
        });
        $emailSent = $emailTagged->filter(fn ($e) => str_contains((string) ($e->admin_notes ?? ''), '[email_sent]'))->count();
        $emailRatio = $emailTagged->count() > 0 ? round(($emailSent / $emailTagged->count()) * 100, 1) : 0.0;

        return [
            'range_start' => $start->toDateString(),
            'range_end' => $end->toDateString(),
            'confirmed_revenue_eur' => $confirmedRevenue,
            'lost_revenue_eur' => $lostRevenue,
            'email_success_ratio' => $emailRatio,
            'counts' => [
                'confirmed' => $weekEnrollments->whereIn('status', [
                    LessonUser::STATUS_CONFIRMED,
                    LessonUser::STATUS_ENROLLED,
                    LessonUser::STATUS_ATTENDED,
                ])->count(),
                'pending' => $weekEnrollments->where('status', LessonUser::STATUS_PENDING)->count(),
                'expired' => $weekEnrollments->where('status', LessonUser::STATUS_EXPIRED)->count(),
            ],
        ];
    }

    /**
     * Consola del Comandante: gestión del día, trigger Surf-Trip, marcar olas óptimas.
     */
    public function index(Request $request)
    {
        $tz = BusinessDateTime::appTimezone();
        $date = $request->has('date')
            ? BusinessDateTime::parseInAppTimezone((string) $request->input('date'))->startOfDay()
            : BusinessDateTime::today();
        $staffId = $request->filled('staff_id') ? (int) $request->input('staff_id') : null;
        if ($staffId !== null && $staffId <= 0) {
            $staffId = null;
        }

        $lessons = Lesson::query()
            ->whereDate('starts_at', $date)
            ->when($staffId, function ($q) use ($staffId) {
                $q->whereHas('staffAssignments', function ($sq) use ($staffId) {
                    $sq->where('role', StaffAssignment::ROLE_MONITOR)
                        ->where('user_id', $staffId);
                });
            })
            ->with(['staffAssignments.user', 'enrollments.user'])
            ->orderBy('starts_at')
            ->get()
            ->map(fn (Lesson $l) => [
                'id' => $l->id,
                'starts_at' => BusinessDateTime::toApi($l->starts_at),
                'ends_at' => BusinessDateTime::toApi($l->ends_at),
                'level' => $l->level,
                'modality' => $l->modality,
                'batch_id' => $l->batch_id,
                'max_slots' => $l->max_slots,
                'location' => $l->location,
                'is_surf_trip' => $l->is_surf_trip,
                'is_optimal_waves' => $l->is_optimal_waves,
                'status' => $l->status,
                'is_private' => (bool) ($l->is_private ?? false),
                'enrollments' => $l->enrollments->map(fn ($e) => [
                    'id' => $e->id,
                    'user_id' => $e->user_id,
                    'status' => $e->status,
                    'party_size' => (int) ($e->party_size ?? 1),
                    'created_at' => $e->created_at?->toIso8601String(),
                    'has_proof' => ! empty($e->payment_proof_path),
                    'admin_notes' => $e->admin_notes,
                    'user' => $l->is_private ? null : ($e->user ? ['id' => $e->user->id, 'nombre' => $e->user->nombre ?? $e->user->name] : null),
                ]),
                'staff' => $l->staffAssignments->map(fn ($s) => [
                    'role' => $s->role,
                    'user' => $s->user ? ['id' => $s->user->id, 'nombre' => $s->user->nombre ?? $s->user->name] : null,
                ]),
            ]);

        $staff = User::query()
            ->where('role', 'admin')
            ->orWhereHas('staffAssignments', function ($q) {
                $q->where('role', StaffAssignment::ROLE_MONITOR);
            })
            ->orderBy('nombre')
            ->get(['id', 'nombre', 'apellido', 'email'])
            ->unique('id')
            ->values();

        return Inertia::render('Admin/Academy/Commander', [
            'lessons' => $lessons,
            'selectedDate' => $date->format('Y-m-d'),
            'staff' => $staff,
            'selectedStaffId' => $staffId,
        ]);
    }

    public function lessonDetails(Lesson $lesson)
    {
        $lesson->load([
            'staffAssignments.user:id,nombre,apellido,email',
            'enrollments.user:id,nombre,apellido,email',
        ]);

        $statusLabels = [
            LessonUser::STATUS_PENDING => 'Pendiente',
            LessonUser::STATUS_PENDING_EXTRA_MONITOR => 'Pendiente (extra monitor)',
            LessonUser::STATUS_CONFIRMED => 'Confirmado',
            LessonUser::STATUS_ENROLLED => 'Inscrito',
            LessonUser::STATUS_ATTENDED => 'Asistido',
            LessonUser::STATUS_CANCELLED => 'Cancelado',
            LessonUser::STATUS_EXPIRED => 'Expirado',
            LessonUser::STATUS_REFUNDED => 'Reembolsado',
        ];

        $staffMembers = $lesson->staffAssignments->map(function ($assignment) {
            return [
                'id' => (int) $assignment->id,
                'role' => $assignment->role,
                'name' => trim((string) (($assignment->user?->nombre ?? '').' '.($assignment->user?->apellido ?? ''))),
                'email' => $assignment->user?->email,
            ];
        })->values();

        $students = $lesson->enrollments->map(function (LessonUser $enrollment) use ($statusLabels) {
            $displayName = trim((string) (($enrollment->user?->nombre ?? '').' '.($enrollment->user?->apellido ?? '')));
            $hasProof = ! empty($enrollment->payment_proof_path);
            $paymentState = 'Pendiente de pago';
            if ($hasProof && ($enrollment->payment_status ?? '') === LessonUser::PAYMENT_PENDING) {
                $paymentState = 'Justificante subido';
            }
            if (($enrollment->payment_method ?? null) === 'tienda') {
                $paymentState = 'Pagado (Tienda)';
            } elseif ($enrollment->payment_status === LessonUser::PAYMENT_CONFIRMED) {
                $paymentState = $hasProof ? 'Pagado (Justificante)' : 'Pagado (Bono/Tienda)';
            }

            return [
                'id' => (int) $enrollment->id,
                'name' => $displayName !== '' ? $displayName : '—',
                'email' => $enrollment->user?->email,
                'status' => $enrollment->status,
                'status_label' => $statusLabels[$enrollment->status] ?? ucfirst((string) $enrollment->status),
                'payment_status' => $enrollment->payment_status ?? LessonUser::PAYMENT_PENDING,
                'payment_state_label' => $paymentState,
                'payment_method' => $enrollment->payment_method,
                'has_payment_proof' => $hasProof,
                'payment_proof_url' => $hasProof ? route('admin.academy.enrollments.proof', $enrollment->id) : null,
            ];
        })->values();

        return response()->json([
            'lesson' => [
                'id' => (int) $lesson->id,
                'starts_at' => BusinessDateTime::toApi($lesson->starts_at),
                'ends_at' => BusinessDateTime::toApi($lesson->ends_at),
                'level' => $lesson->level,
                'location' => $lesson->location,
                'price' => $lesson->price !== null ? (float) $lesson->price : null,
                'currency' => $lesson->currency ?? 'EUR',
                'modality' => $lesson->modality,
                'status' => $lesson->status,
            ],
            'staff' => $staffMembers,
            'students' => $students,
        ]);
    }

    /**
     * Marcar/desmarcar día con olas óptimas para una lección.
     */
    public function toggleOptimalWaves(Lesson $lesson)
    {
        $lesson->update(['is_optimal_waves' => ! $lesson->is_optimal_waves]);

        return back()->with('success', 'Olas óptimas actualizadas.');
    }

    /**
     * Trigger Surf-Trip: cambia ubicación a Playa Secundaria (Furgoneta).
     */
    public function triggerSurfTrip(Lesson $lesson)
    {
        $lesson->update([
            'is_surf_trip' => true,
            'location' => 'Playa Secundaria (Furgoneta)',
            'surf_trip_triggered_at' => BusinessDateTime::now(),
        ]);

        return back()->with('success', 'Surf-Trip activado. Los alumnos deben confirmar asistencia.');
    }

    /**
     * Cancelar clase por Mal Mar (Observer devolverá créditos).
     */
    public function cancelMalMar(Lesson $lesson)
    {
        $lesson->update([
            'status' => Lesson::STATUS_CANCELLED,
            'cancellation_reason' => Lesson::CANCELLATION_MAL_MAR,
        ]);

        return back()->with('success', 'Clase cancelada por mal mar. Créditos devueltos.');
    }

    /**
     * Cancelación manual de una sesión (no pack).
     * Marca la lección como cancelled y cancela inscripciones activas (marca para revisión al alumno).
     */
    public function cancelLesson(Request $request, Lesson $lesson)
    {
        $validated = $request->validate([
            'admin_notes' => 'nullable|string|max:2000',
        ]);

        if ($lesson->starts_at && $lesson->starts_at->isPast()) {
            return back()->with('error', 'No se puede cancelar una clase pasada.');
        }

        $lesson->update([
            'status' => Lesson::STATUS_CANCELLED,
            'cancellation_reason' => 'admin_cancel',
        ]);

        LessonUser::query()
            ->where('lesson_id', $lesson->id)
            ->whereIn('status', [
                LessonUser::STATUS_PENDING,
                LessonUser::STATUS_CONFIRMED,
                LessonUser::STATUS_ENROLLED,
                LessonUser::STATUS_ATTENDED,
            ])
            ->get()
            ->each(function (LessonUser $enrollment) use ($validated): void {
                $enrollment->status = LessonUser::STATUS_CANCELLED;
                $enrollment->cancelled_at = BusinessDateTime::now();
                $enrollment->admin_notes = $validated['admin_notes'] ?? 'Clase cancelada por el staff.';
                $enrollment->refund_status = ($enrollment->payment_status ?? '') === LessonUser::PAYMENT_CONFIRMED
                    ? LessonUser::REFUND_PENDING
                    : null;
                $enrollment->save();
            });

        return back()->with('success', 'Clase cancelada.');
    }

    /**
     * Cancelación inteligente de Pack Semanal: cancela todas las lecciones futuras del mismo batch_id.
     * Además cancela inscripciones activas (marca para revisión/notificación en panel alumno).
     */
    public function cancelBatch(Request $request)
    {
        $validated = $request->validate([
            'batch_id' => 'required|string|max:64',
            'admin_notes' => 'nullable|string|max:2000',
        ]);

        $batchId = $validated['batch_id'];
        $notes = $validated['admin_notes'] ?? 'Pack semanal cancelado por el staff.';

        $lessonIds = Lesson::query()
            ->where('batch_id', $batchId)
            ->where('starts_at', '>=', BusinessDateTime::now())
            ->pluck('id')
            ->toArray();

        if (empty($lessonIds)) {
            return back()->with('error', 'No hay sesiones futuras en este pack para cancelar.');
        }

        Lesson::query()
            ->whereIn('id', $lessonIds)
            ->update([
                'status' => Lesson::STATUS_CANCELLED,
                'cancellation_reason' => 'batch_cancel',
            ]);

        // Marcar inscripciones para revisión/aviso al alumno
        LessonUser::query()
            ->whereIn('lesson_id', $lessonIds)
            ->whereIn('status', [
                LessonUser::STATUS_PENDING,
                LessonUser::STATUS_CONFIRMED,
                LessonUser::STATUS_ENROLLED,
                LessonUser::STATUS_ATTENDED,
            ])
            ->get()
            ->each(function (LessonUser $enrollment) use ($notes): void {
                $enrollment->status = LessonUser::STATUS_CANCELLED;
                $enrollment->cancelled_at = BusinessDateTime::now();
                $enrollment->admin_notes = $notes;
                $enrollment->refund_status = ($enrollment->payment_status ?? '') === LessonUser::PAYMENT_CONFIRMED
                    ? LessonUser::REFUND_PENDING
                    : null;
                $enrollment->save();
            });

        return back()->with('success', 'Pack semanal cancelado (sesiones futuras).');
    }

    /**
     * Asignar o quitar monitor/fotógrafo. Si user_id viene vacío, se elimina la asignación.
     */
    public function assignStaff(Request $request)
    {
        $request->validate([
            'lesson_id' => 'required|exists:lessons,id',
            'role' => 'required|in:monitor,monitor_2,fotografo',
            'user_id' => 'nullable|exists:users,id',
        ]);

        $lessonId = $request->input('lesson_id');
        $userId = $request->input('user_id');
        $role = $request->input('role');

        $assignment = StaffAssignment::where('lesson_id', $lessonId)->where('role', $role)->first();

        if (! $userId) {
            if ($assignment) {
                $assignment->delete();
            }
            $lesson = Lesson::find($lessonId);
            if ($lesson?->starts_at) {
                $this->rebalanceVipCapacitiesForDate($lesson->starts_at);
            }

            return back()->with('success', 'Staff desasignado.');
        }

        StaffAssignment::updateOrCreate(
            ['lesson_id' => $lessonId, 'role' => $role],
            ['user_id' => $userId]
        );
        $lesson = Lesson::find($lessonId);
        if ($lesson?->starts_at) {
            $this->rebalanceVipCapacitiesForDate($lesson->starts_at);
        }

        return back()->with('success', 'Staff asignado.');
    }

    /**
     * Crear clase (formulario/store).
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'starts_at' => 'required|date',
            'ends_at' => 'nullable|date|after:starts_at',
            'duration_minutes' => 'nullable|integer|in:60,90',
            'level' => 'required|in:iniciacion,intermedio,avanzado',
            'modality' => 'required|in:particular,grupal,semanal',
            'max_slots' => 'integer|min:1|max:12',
            'description' => 'nullable|string|max:500',
            'location' => 'nullable|string|max:150',
            'weekly_start' => 'nullable|date',
            'weekly_end' => 'nullable|date|after_or_equal:weekly_start',
            'booker_first_name' => 'nullable|string|max:80',
            'booker_last_name' => 'nullable|string|max:80',
            'booker_phone' => 'nullable|string|max:40',
            'participants' => 'nullable|array',
            'participants.*.first_name' => 'required_with:participants|string|max:80',
            'participants.*.last_name' => 'required_with:participants|string|max:80',
            'participants.*.phone' => 'nullable|string|max:40',
            'participants.*.email' => 'nullable|email|max:120',
            'participants.*.payment_status' => 'nullable|in:pending,confirmed,rejected',
        ]);

        $location = $validated['location'] ?? 'Zurriola';
        $modality = $validated['modality'];
        $durationMinutes = (int) ($validated['duration_minutes'] ?? 90);
        $minDuration = 60;
        if ($durationMinutes % 15 !== 0) {
            return back()->withErrors([
                'duration_minutes' => 'La duración debe estar en intervalos de 15 minutos.',
            ])->withInput();
        }
        if ($durationMinutes < $minDuration) {
            return back()->withErrors([
                'duration_minutes' => 'La duración mínima de una sesión es de 1 hora.',
            ])->withInput();
        }
        if ($durationMinutes % 15 !== 0) {
            return back()->withErrors([
                'duration_minutes' => 'La duración debe estar en intervalos de 15 minutos.',
            ])->withInput();
        }
        if ($durationMinutes < $minDuration) {
            return back()->withErrors([
                'duration_minutes' => 'La duración mínima de una sesión es de 1 hora.',
            ])->withInput();
        }

        if ($modality === Lesson::MODALITY_SEMANAL) {
            $batchId = (string) Str::uuid();
            $start = BusinessDateTime::parseInAppTimezone((string) ($validated['weekly_start'] ?? $validated['starts_at']))->startOfDay();
            $end = BusinessDateTime::parseInAppTimezone((string) ($validated['weekly_end'] ?? $validated['ends_at']))->endOfDay();
            $created = 0;

            for ($d = $start->copy(); $d->lte($end); $d->addDay()) {
                // Lunes(1) a Viernes(5)
                if ($d->dayOfWeekIso < 1 || $d->dayOfWeekIso > 5) {
                    continue;
                }

                $s = BusinessDateTime::parseInAppTimezone($validated['starts_at']);
                $startsAt = $d->copy()->setTime($s->hour, $s->minute);
                $endsAt = $startsAt->copy()->addMinutes($durationMinutes);
                $projectedPartySize = ((int) ($validated['max_slots'] ?? 6)) >= 7 ? 7 : 1;
                $availability = $this->availabilityService->preview($startsAt, $endsAt, $projectedPartySize);
                if (! $this->isQuarterMinute($startsAt) || ! $this->isQuarterMinute($endsAt)) {
                    return back()->withErrors([
                        'starts_at' => 'Las horas deben estar en intervalos de 15 minutos (:00, :15, :30, :45).',
                    ])->withInput();
                }
                if (! $availability['allowed']) {
                    return back()->withErrors([
                        'starts_at' => $this->availabilityService->buildConflictMessage($availability),
                    ])->withInput();
                }

                Lesson::create([
                    'starts_at' => $startsAt,
                    'ends_at' => $endsAt,
                    'level' => $validated['level'],
                    'modality' => $modality,
                    'batch_id' => $batchId,
                    'max_slots' => $validated['max_slots'] ?? 6,
                    'description' => $validated['description'] ?? null,
                    'location' => $location,
                ]);
                $created++;
            }

            $firstLesson = Lesson::query()
                ->where('batch_id', $batchId)
                ->orderBy('starts_at')
                ->first();
            if ($firstLesson) {
                $this->applyWalkInFromRequest($firstLesson, $validated);
            }

            return back()->with('success', "Curso semanal creado ({$created} sesiones).");
        }

        $startsAt = BusinessDateTime::parseInAppTimezone($validated['starts_at']);
        $endsAt = $startsAt->copy()->addMinutes($durationMinutes);
        if (! $this->isQuarterMinute($startsAt) || ! $this->isQuarterMinute($endsAt)) {
            return back()->withErrors([
                'starts_at' => 'Las horas deben estar en intervalos de 15 minutos (:00, :15, :30, :45).',
            ])->withInput();
        }
        $projectedPartySize = ((int) ($validated['max_slots'] ?? 6)) >= 7 ? 7 : 1;
        $availability = $this->availabilityService->preview($startsAt, $endsAt, $projectedPartySize);
        if (! $availability['allowed']) {
            return back()->withErrors([
                'starts_at' => $this->availabilityService->buildConflictMessage($availability),
            ])->withInput();
        }

        $lesson = Lesson::create([
            'starts_at' => $startsAt,
            'ends_at' => $endsAt,
            'level' => $validated['level'],
            'modality' => $modality,
            'max_slots' => $validated['max_slots'] ?? 6,
            'description' => $validated['description'] ?? null,
            'location' => $location,
            'is_private' => $modality === Lesson::MODALITY_PARTICULAR,
        ]);

        $this->applyWalkInFromRequest($lesson, $validated);

        return back()->with('success', 'Clase creada.');
    }

    /**
     * Actualizar clase: metadatos ligeros o reprogramación (grupal/semanal/particular).
     */
    public function update(Request $request, Lesson $lesson)
    {
        if ($request->filled('starts_at')) {
            return $this->updateLessonSchedule($request, $lesson);
        }

        $validated = $request->validate([
            'description' => 'nullable|string|max:500',
            'location' => 'nullable|string|max:150',
            'internal_notes' => 'nullable|string|max:1000',
        ]);

        $lesson->update(array_filter($validated, fn ($v) => $v !== null));

        return back()->with('success', 'Clase actualizada.');
    }

    private function updateLessonSchedule(Request $request, Lesson $lesson)
    {
        abort_if((string) $lesson->modality === 'vip', 403, 'Las clases VIP se editan desde el gestor VIP.');

        if ($lesson->status === Lesson::STATUS_CANCELLED) {
            return back()->with('error', 'No se puede editar una clase cancelada.');
        }

        if ($lesson->starts_at && $lesson->starts_at->isPast()) {
            return back()->with('error', 'No se puede editar una clase pasada.');
        }

        $validated = $request->validate([
            'starts_at' => 'required|date',
            'duration_minutes' => 'nullable|integer|in:60,90',
            'level' => 'required|in:iniciacion,intermedio,avanzado',
            'max_slots' => 'integer|min:1|max:12',
            'location' => 'nullable|string|max:150',
            'monitor_id' => 'nullable|integer|exists:users,id',
            'monitor_2_id' => 'nullable|integer|exists:users,id',
            'has_photographer' => 'nullable|boolean',
            'photographer_id' => 'nullable|integer|exists:users,id',
        ]);

        $modality = (string) ($lesson->modality ?: Lesson::MODALITY_GRUPAL);
        $durationMinutes = (int) ($validated['duration_minutes'] ?? 90);
        $startsAt = BusinessDateTime::parseInAppTimezone($validated['starts_at']);
        $endsAt = $startsAt->copy()->addMinutes($durationMinutes);

        if (! $this->isQuarterMinute($startsAt) || ! $this->isQuarterMinute($endsAt)) {
            return back()->withErrors([
                'starts_at' => 'Las horas deben estar en intervalos de 15 minutos (:00, :15, :30, :45).',
            ])->withInput();
        }

        $maxSlots = (int) ($validated['max_slots'] ?? $lesson->max_slots ?? 6);
        $projectedPartySize = $maxSlots >= 7 ? 7 : 1;
        $availability = $this->availabilityService->preview($startsAt, $endsAt, $projectedPartySize, (int) $lesson->id);

        if (! $availability['allowed']) {
            return back()->withErrors([
                'starts_at' => $this->availabilityService->buildConflictMessage($availability),
            ])->withInput();
        }

        $lesson->update([
            'starts_at' => $startsAt,
            'ends_at' => $endsAt,
            'level' => $validated['level'],
            'max_slots' => $maxSlots,
            'max_capacity' => $maxSlots,
            'location' => $validated['location'] ?? $lesson->location ?? 'Zurriola',
            'is_private' => $modality === Lesson::MODALITY_PARTICULAR,
        ]);

        try {
            $this->syncLessonStaffAction->execute($lesson, $validated);
        } catch (\InvalidArgumentException $e) {
            return back()->withErrors(['staff' => $e->getMessage()])->withInput();
        }

        return back()->with('success', 'Clase actualizada.');
    }

    /**
     * Confirmar solicitud (pending → confirmed). Admin comprueba pago.
     */
    public function confirmEnrollment(int $enrollmentId)
    {
        $enrollment = LessonUser::with('user', 'lesson')->findOrFail($enrollmentId);

        if (
            ($enrollment->payment_status ?? '') === LessonUser::PAYMENT_REJECTED
            && $enrollment->status !== LessonUser::STATUS_PENDING
        ) {
            $enrollment->update([
                'payment_status' => LessonUser::PAYMENT_CONFIRMED,
                'refund_status' => null,
                'reviewed_at' => null,
            ]);

            return back()->with('success', 'Pago marcado como confirmado.');
        }

        if (($enrollment->payment_status ?? '') === LessonUser::PAYMENT_CONFIRMED) {
            return back()->with('error', 'Este pago ya está confirmado.');
        }

        if ($enrollment->status !== LessonUser::STATUS_PENDING) {
            return back()->with('error', 'Solo se pueden confirmar solicitudes pendientes.');
        }

        $lesson = $enrollment->lesson;
        if ($lesson) {
            $blockingStatuses = $this->availabilityService->occupancyStatuses();
            $alreadyBooked = (int) LessonUser::query()
                ->where('lesson_id', $lesson->id)
                ->whereIn('status', $blockingStatuses)
                ->sum(\Illuminate\Support\Facades\DB::raw('COALESCE(quantity, party_size, 1)'));
            $incoming = (int) ($enrollment->quantity ?? $enrollment->party_size ?? 1);
            $projectedPartySize = $alreadyBooked + max(1, $incoming);

            $availability = $this->availabilityService->preview(
                $lesson->starts_at,
                $lesson->ends_at,
                $projectedPartySize,
                (int) $lesson->id
            );

            if (! $availability['allowed']) {
                return back()->withErrors([
                    'status' => $this->availabilityService->buildConflictMessage($availability),
                ]);
            }
        }

        $enrollment->update([
            'status' => LessonUser::STATUS_CONFIRMED,
            'confirmed_at' => BusinessDateTime::now(),
            'payment_status' => LessonUser::PAYMENT_CONFIRMED,
            'refund_status' => null,
            'reviewed_at' => null,
        ]);
        $googleMapsUrl = config('services.academy.maps_url');
        if ($enrollment->user && $enrollment->user->email) {
            try {
                Mail::to($enrollment->user->email)->queue(new ReservationConfirmedMail($enrollment->user, $enrollment->lesson, $googleMapsUrl));
                $this->stampEmailStatus($enrollment, 'sent');
            } catch (\Throwable $e) {
                Log::error('Error enviando ReservationConfirmedMail', [
                    'enrollment_id' => $enrollment->id,
                    'lesson_id' => $enrollment->lesson_id,
                    'user_id' => $enrollment->user_id,
                    'error' => $e->getMessage(),
                ]);
                $this->stampEmailStatus($enrollment, 'error', $e->getMessage());
            }
        }

        return back()->with('success', 'Solicitud confirmada.');
    }

    /**
     * Reenviar confirmación de reserva (suite de recuperación).
     */
    public function resendConfirmation(Request $request, int $enrollmentId)
    {
        $enrollment = LessonUser::with('user', 'lesson')->findOrFail($enrollmentId);
        if ($enrollment->status !== LessonUser::STATUS_CONFIRMED) {
            abort(403, 'Solo se permite reenviar correos para reservas confirmadas.');
        }

        $validated = $request->validate([
            'email' => 'nullable|email:rfc,dns|max:255',
        ]);

        if (! $enrollment->user) {
            return back()->with('error', 'No hay usuario asociado a esta inscripción.');
        }

        $newEmail = $validated['email'] ?? null;
        if ($newEmail) {
            $enrollment->user->email = $newEmail;
            $enrollment->user->save();
        }

        if (! $enrollment->user->email) {
            return back()->with('error', 'El usuario no tiene un email válido para reenviar.');
        }

        $googleMapsUrl = config('services.academy.maps_url');
        try {
            Mail::to($enrollment->user->email)->queue(new ReservationConfirmedMail($enrollment->user, $enrollment->lesson, $googleMapsUrl));
            $this->stampEmailStatus($enrollment, 'sent', null, true);
            $userName = $enrollment->user->nombre ?? $enrollment->user->name ?? 'alumno';

            return back()->with('success', "¡Email enviado y corregido para {$userName}! 📧✨");
        } catch (\Throwable $e) {
            Log::error('Error reenviando ReservationConfirmedMail', [
                'enrollment_id' => $enrollment->id,
                'lesson_id' => $enrollment->lesson_id,
                'user_id' => $enrollment->user_id,
                'error' => $e->getMessage(),
            ]);
            $this->stampEmailStatus($enrollment, 'error', $e->getMessage(), true);

            return back()->with('error', 'No se pudo reenviar el email. Revisa el detalle en el badge.');
        }
    }

    private function stampEmailStatus(LessonUser $enrollment, string $status, ?string $errorMessage = null, bool $incrementAttempt = false): void
    {
        $notes = (string) ($enrollment->admin_notes ?? '');
        $notes = preg_replace('/\s*\[email_sent\]/', '', $notes) ?? '';
        $notes = preg_replace('/\s*\[email_error:[^\]]+\]/', '', $notes) ?? '';
        $attempts = 0;
        if (preg_match('/\[attempts:(\d+)\]/', $notes, $m)) {
            $attempts = (int) ($m[1] ?? 0);
        }
        $notes = preg_replace('/\s*\[attempts:\d+\]/', '', $notes) ?? '';
        if ($incrementAttempt) {
            $attempts = max(0, $attempts) + 1;
        }

        $notes = trim($notes);

        if ($status === 'sent') {
            $notes = trim($notes.' [email_sent]');
        } else {
            $safeError = \Illuminate\Support\Str::limit(preg_replace('/[\r\n]+/', ' ', (string) $errorMessage), 140, '');
            $notes = trim($notes." [email_error:{$safeError}]");
        }
        if ($attempts > 0) {
            $notes = trim($notes." [attempts:{$attempts}]");
        }

        $enrollment->admin_notes = $notes;
        $enrollment->save();
    }

    private function isQuarterMinute(Carbon $value): bool
    {
        return ((int) $value->minute % 15) === 0;
    }

    private function rebalanceVipCapacitiesForDate(Carbon $date): void
    {
        // Mantener cupo configurado por administración.
        // La disponibilidad por monitores se calcula en runtime (ClassManagerController::mapLesson).
    }

    /**
     * Rechazar justificante: cancelar solicitud y guardar motivo.
     */
    public function rejectEnrollmentProof(Request $request, int $enrollmentId)
    {
        $validated = $request->validate([
            'admin_notes' => 'nullable|string|max:2000',
        ]);

        $note = trim((string) ($validated['admin_notes'] ?? '')) !== ''
            ? trim((string) $validated['admin_notes'])
            : 'Justificante rechazado.';

        $enrollment = LessonUser::findOrFail($enrollmentId);

        if (($enrollment->payment_status ?? '') === LessonUser::PAYMENT_REJECTED) {
            return back()->with('error', 'Este pago ya está rechazado.');
        }

        if ($enrollment->status === LessonUser::STATUS_PENDING) {
            $enrollment->update([
                'status' => LessonUser::STATUS_CANCELLED,
                'payment_status' => LessonUser::PAYMENT_REJECTED,
                'refund_status' => null,
                'admin_notes' => $note,
                'cancelled_at' => BusinessDateTime::now(),
                'reviewed_at' => null,
            ]);

            return back()->with('success', 'Justificante rechazado y solicitud cancelada.');
        }

        $ps = $enrollment->payment_status ?? '';
        if (($ps === LessonUser::PAYMENT_CONFIRMED) || ($ps === LessonUser::PAYMENT_PENDING && ! empty($enrollment->payment_proof_path))) {
            $enrollment->update([
                'payment_status' => LessonUser::PAYMENT_REJECTED,
                'refund_status' => $ps === LessonUser::PAYMENT_CONFIRMED ? LessonUser::REFUND_PENDING : null,
                'status' => $ps === LessonUser::PAYMENT_CONFIRMED ? LessonUser::STATUS_CANCELLED : $enrollment->status,
                'cancelled_at' => $ps === LessonUser::PAYMENT_CONFIRMED ? BusinessDateTime::now() : $enrollment->cancelled_at,
                'admin_notes' => $note,
                'reviewed_at' => null,
            ]);

            return back()->with('success', 'Pago marcado como rechazado.');
        }

        return back()->with('error', 'No hay un pago enviado o confirmado que se pueda rechazar en este estado.');
    }

    /**
     * Ver comprobante de pago (solo Admin). Archivos en storage privado.
     */
    public function showProof(int $enrollmentId)
    {
        $enrollment = LessonUser::findOrFail($enrollmentId);
        if (empty($enrollment->payment_proof_path)) {
            abort(404);
        }
        if (! Storage::disk('local')->exists($enrollment->payment_proof_path)) {
            abort(404);
        }
        $path = Storage::disk('local')->path($enrollment->payment_proof_path);
        $mime = Storage::disk('local')->mimeType($enrollment->payment_proof_path);

        return response()->file($path, ['Content-Type' => $mime]);
    }

    /**
     * Reactivar solicitud EXPIRED: +1h para pagar (status → PENDING, expires_at = now + 1h).
     */
    public function reactivateEnrollment(int $enrollmentId)
    {
        $enrollment = LessonUser::findOrFail($enrollmentId);
        if ($enrollment->status !== LessonUser::STATUS_EXPIRED) {
            return back()->with('error', 'Solo se pueden reactivar solicitudes expiradas.');
        }
        $enrollment->update([
            'status' => LessonUser::STATUS_PENDING,
            'expires_at' => Carbon::now('UTC')->addHour(),
        ]);

        return back()->with('success', 'Solicitud reactivada 1h más.');
    }

    /**
     * Eliminar en lote solicitudes pendientes con más de 48h (garbage collector).
     */
    public function bulkDeleteStale(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'integer|exists:lesson_user,id',
        ]);

        $cutoff = BusinessDateTime::now()->subHours(48);
        $deleted = LessonUser::query()
            ->whereIn('id', $validated['ids'])
            ->where('status', LessonUser::STATUS_PENDING)
            ->where('created_at', '<', $cutoff)
            ->delete();

        return back()->with('success', "Se eliminaron {$deleted} solicitudes antiguas.");
    }

    private function resolveEnrollmentRefundStatus(LessonUser $enrollment, ?Lesson $lesson = null): ?string
    {
        if (! $this->shouldTrackRefundForEnrollment($enrollment, $lesson)) {
            return null;
        }

        return $enrollment->refund_status ?: LessonUser::REFUND_PENDING;
    }

    private function resolveBookingRefundStatus(Booking $booking): ?string
    {
        if (! $this->shouldTrackRefundForBooking($booking)) {
            return null;
        }

        return $booking->refund_status ?: Booking::REFUND_PENDING;
    }

    private function shouldTrackRefundForEnrollment(LessonUser $enrollment, ?Lesson $lesson = null): bool
    {
        if (! $this->isEnrollmentCancelledLike($enrollment->status)) {
            return false;
        }

        return ($enrollment->payment_status ?? '') === LessonUser::PAYMENT_CONFIRMED
            || ! empty($enrollment->refund_status);
    }

    private function isEnrollmentCancelledLike(?string $status): bool
    {
        return in_array($status, [
            LessonUser::STATUS_CANCELLED,
            LessonUser::STATUS_CANCELLED_FREE,
            LessonUser::STATUS_CANCELLED_LATE_LOST,
            LessonUser::STATUS_CANCELLED_LATE_RESCUED,
            LessonUser::STATUS_REFUNDED,
        ], true);
    }

    private function shouldTrackRefundForBooking(Booking $booking): bool
    {
        return ($booking->status ?? '') === Booking::STATUS_CANCELLED
            && (
                ($booking->payment_status ?? '') === Booking::PAYMENT_CONFIRMED
                || ! empty($booking->refund_status)
            );
    }

    /**
     * Fecha relativa "Hoy a las HH:mm" usando el reloj de negocio (Madrid), no el TZ del servidor.
     */
    private function dashboardCreatedAtHuman(?Carbon $dt): ?string
    {
        if ($dt === null) {
            return null;
        }

        $wall = $dt->copy()->timezone(BusinessDateTime::businessTimezone());

        if ($wall->isSameDay(BusinessDateTime::today())) {
            return 'Hoy a las '.$wall->format('H:i');
        }

        return $wall->locale('es')->translatedFormat('d/m/Y H:i');
    }

    /** @param  array<string, mixed>  $validated */
    private function applyWalkInFromRequest(Lesson $lesson, array $validated): void
    {
        $bookerFirst = trim((string) ($validated['booker_first_name'] ?? '')) ?: null;
        $bookerLast = trim((string) ($validated['booker_last_name'] ?? '')) ?: null;
        $bookerPhone = trim((string) ($validated['booker_phone'] ?? '')) ?: null;

        /** @var list<AdminGuestEnrollmentDto> $participants */
        $participants = collect($validated['participants'] ?? [])
            ->filter(fn ($row) => is_array($row))
            ->map(fn (array $row) => AdminGuestEnrollmentDto::fromArray($row))
            ->values()
            ->all();

        if ($bookerFirst === null && $bookerLast === null && $bookerPhone === null && $participants === []) {
            return;
        }

        try {
            $this->guestEnrollmentAction->syncBookerAndParticipants(
                $lesson,
                $bookerFirst,
                $bookerLast,
                $bookerPhone,
                $participants
            );
        } catch (\InvalidArgumentException $e) {
            // La clase ya está creada; el admin puede añadir alumnos desde el gestor.
            Log::warning('applyWalkInFromRequest', ['lesson_id' => $lesson->id, 'error' => $e->getMessage()]);
        }
    }
}
