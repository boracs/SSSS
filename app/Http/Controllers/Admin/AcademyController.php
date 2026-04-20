<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Mail\ReservationConfirmedMail;
use App\Models\Booking;
use App\Models\Lesson;
use App\Models\LessonUser;
use App\Models\StaffAssignment;
use App\Models\User;
use App\Models\UserBono;
use App\Services\AutoReleaseService;
use App\Services\AvailabilityService;
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
        protected AvailabilityService $availabilityService
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
        $status = $request->query('status', 'all'); // all|pending|submitted|confirmed
        $validStatuses = ['all', 'pending', 'submitted', 'confirmed'];
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
                $academyWa = preg_replace('/\D/', '', (string) config('services.academy.whatsapp_number', '34600000000'));
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
                    'extra_monitor_whatsapp_url' => $requiresSecondMonitor ? ('https://wa.me/'.$academyWa.'?text='.rawurlencode($waText)) : null,
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
            'submitted' => LessonUser::query()->where('payment_status', LessonUser::PAYMENT_SUBMITTED)->count(),
            'confirmed' => LessonUser::query()->where('payment_status', LessonUser::PAYMENT_CONFIRMED)->count(),
        ];

        $rentalCounts = [
            'all' => Booking::query()->count(),
            'pending' => Booking::query()->where('payment_status', Booking::PAYMENT_PENDING)->count(),
            'submitted' => Booking::query()->where('payment_status', Booking::PAYMENT_SUBMITTED)->count(),
            'confirmed' => Booking::query()->where('payment_status', Booking::PAYMENT_CONFIRMED)->count(),
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
                'submittedCount' => ($lessonCounts['submitted'] ?? 0) + ($rentalCounts['submitted'] ?? 0),
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

        $projectedPartySize = (int) ($validated['projected_party_size'] ?? 1);
        $evaluation = $this->availabilityService->evaluate($startsAt, $endsAt, $projectedPartySize, 0);

        $payload = [
            'max_capacity' => (int) $evaluation['max_capacity'],
            'peak_monitors_used' => (int) ($evaluation['peak_monitors_used'] ?? 0),
            'occupied_lesson_ids' => $evaluation['occupied_lesson_ids'] ?? [],
            'range_start' => $evaluation['request_window_start'],
            'range_end' => $evaluation['request_window_end'],
            'is_staff_exhausted' => (int) $evaluation['max_capacity'] === 0,
            'message' => (int) $evaluation['max_capacity'] === 0
                ? 'No quedan monitores disponibles en este horario (se requiere disponibilidad 15 min antes y 15 min después).'
                : null,
        ];

        return response()->json($payload, (int) $evaluation['max_capacity'] === 0 ? 422 : 200);
    }

    /**
     * Dashboard global de pagos (Clases + Alquileres + Bonos VIP).
     */
    public function globalPaymentsDashboard(Request $request)
    {
        $status = $request->query('status', 'all'); // all|pending|submitted|confirmed
        $validStatuses = ['all', 'pending', 'submitted', 'confirmed'];
        if (! in_array($status, $validStatuses, true)) {
            $status = 'all';
        }

        $bonoStatus = $request->query('bono_status', 'all'); // all|pending_validation|pending_payment|confirmed
        $validBonoStatuses = ['all', 'pending_validation', 'pending_payment', 'confirmed'];
        if (! in_array($bonoStatus, $validBonoStatuses, true)) {
            $bonoStatus = 'all';
        }

        $bonoPackId = $request->query('bono_pack_id');
        $bonoPackId = is_numeric($bonoPackId) ? (int) $bonoPackId : null;

        $lessonRows = LessonUser::query()
            ->with(['user', 'lesson'])
            ->when($status !== 'all', fn ($q) => $q->where('payment_status', $status))
            ->orderByDesc('created_at')
            ->limit(400)
            ->get()
            ->map(function (LessonUser $e) {
                return [
                    'id' => $e->id,
                    'user_name' => $e->user ? ($e->user->nombre ?? $e->user->name ?? $e->user->email) : '—',
                    'user' => $e->user ? ($e->user->nombre ?? $e->user->name ?? $e->user->email) : '—',
                    'email' => $e->user?->email,
                    'phone' => $e->user?->telefono,
                    'status' => $e->payment_status ?? LessonUser::PAYMENT_PENDING,
                    'enrollment_status' => $e->status,
                    'proof_url' => ! empty($e->payment_proof_path) ? route('admin.academy.enrollments.proof', $e->id) : null,
                    'amount' => $e->lesson?->price !== null ? (float) $e->lesson->price : 20.0,
                    'lesson_name' => $e->lesson?->title ?: 'Clase de Surf',
                    'modality' => $e->lesson?->modality ?: 'grupal',
                    'date' => $e->lesson?->starts_at ? BusinessDateTime::toApi($e->lesson->starts_at) : null,
                    'date_human' => $e->lesson?->starts_at?->locale('es')->translatedFormat('d/m/Y'),
                ];
            })
            ->values();

        $rentalRows = Booking::query()
            ->with(['user', 'surfboard'])
            ->when($status !== 'all', fn ($q) => $q->where('payment_status', $status))
            ->orderByDesc('created_at')
            ->limit(400)
            ->get()
            ->map(function (Booking $b) {
                return [
                    'id' => $b->id,
                    'user_name' => $b->client_name ?: ($b->user?->nombre ?? $b->user?->name ?? $b->user?->email ?? '—'),
                    'user' => $b->client_name ?: ($b->user?->nombre ?? $b->user?->name ?? $b->user?->email ?? '—'),
                    'email' => $b->user?->email,
                    'phone' => $b->phone ?: $b->user?->telefono,
                    'status' => $b->payment_status ?? Booking::PAYMENT_PENDING,
                    'proof_url' => ! empty($b->payment_proof_path) ? route('admin.bookings.proof', $b->id) : null,
                    'amount' => (float) $b->deposit_amount,
                    'rental_name' => $b->surfboard?->name ? 'Alquiler · '.$b->surfboard->name : 'Alquiler',
                    'date' => $b->start_date?->toIso8601String(),
                    'date_human' => $b->start_date?->locale('es')->translatedFormat('d/m/Y'),
                ];
            })
            ->values();

        $bonoRows = UserBono::query()
            ->with(['user:id,nombre,apellido,email,telefono', 'pack:id,nombre,num_clases,precio'])
            ->when($bonoPackId, fn ($q) => $q->where('pack_id', $bonoPackId))
            ->when($bonoStatus === 'confirmed', fn ($q) => $q->where('status', UserBono::STATUS_CONFIRMED))
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
            ->get()
            ->map(function (UserBono $row) {
                return [
                    'id' => $row->id,
                    'user_name' => $row->user ? trim(($row->user->nombre ?? '').' '.($row->user->apellido ?? '')) : '—',
                    'user' => $row->user ? trim(($row->user->nombre ?? '').' '.($row->user->apellido ?? '')) : '—',
                    'email' => $row->user?->email,
                    'phone' => $row->user?->telefono,
                    'status' => $row->status,
                    'pack_id' => (int) $row->pack_id,
                    'pack' => $row->pack?->nombre,
                    'num_clases' => (int) ($row->pack?->num_clases ?? 0),
                    'amount' => (float) ($row->pack?->precio ?? 0),
                    'has_proof' => ! empty($row->payment_proof_path),
                    'proof_url' => $row->payment_proof_path ? Storage::url($row->payment_proof_path) : null,
                    'created_at' => $row->created_at?->toIso8601String(),
                    'created_at_human' => $row->created_at
                        ? ($row->created_at->isToday()
                            ? 'Hoy a las '.$row->created_at->format('H:i')
                            : $row->created_at->format('d/m/Y H:i'))
                        : null,
                    'date_human' => $row->created_at
                        ? ($row->created_at->isToday()
                            ? 'Hoy a las '.$row->created_at->format('H:i')
                            : $row->created_at->format('d/m/Y H:i'))
                        : null,
                ];
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
            ],
            'lessonRows' => $lessonRows,
            'rentalRows' => $rentalRows,
            'bonoRows' => $bonoRows,
            'bonoPacks' => $bonoPacks,
            'counts' => [
                'lessons' => [
                    'all' => LessonUser::query()->count(),
                    'pending' => LessonUser::query()->where('payment_status', LessonUser::PAYMENT_PENDING)->count(),
                    'submitted' => LessonUser::query()->where('payment_status', LessonUser::PAYMENT_SUBMITTED)->count(),
                    'confirmed' => LessonUser::query()->where('payment_status', LessonUser::PAYMENT_CONFIRMED)->count(),
                ],
                'rentals' => [
                    'all' => Booking::query()->count(),
                    'pending' => Booking::query()->where('payment_status', Booking::PAYMENT_PENDING)->count(),
                    'submitted' => Booking::query()->where('payment_status', Booking::PAYMENT_SUBMITTED)->count(),
                    'confirmed' => Booking::query()->where('payment_status', Booking::PAYMENT_CONFIRMED)->count(),
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
                ],
            ],
        ]);
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

        $lessons = Lesson::query()
            ->whereDate('starts_at', $date)
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

        $staff = User::query()->where('role', 'admin')->get(['id', 'nombre', 'email']);

        return Inertia::render('Admin/Academy/Commander', [
            'lessons' => $lessons,
            'selectedDate' => $date->format('Y-m-d'),
            'staff' => $staff,
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
            ->update([
                'status' => LessonUser::STATUS_CANCELLED,
                'cancelled_at' => BusinessDateTime::now(),
                'admin_notes' => $validated['admin_notes'] ?? 'Clase cancelada por el staff.',
            ]);

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
            ->update([
                'status' => LessonUser::STATUS_CANCELLED,
                'cancelled_at' => BusinessDateTime::now(),
                'admin_notes' => $notes,
            ]);

        return back()->with('success', 'Pack semanal cancelado (sesiones futuras).');
    }

    /**
     * Asignar o quitar monitor/fotógrafo. Si user_id viene vacío, se elimina la asignación.
     */
    public function assignStaff(Request $request)
    {
        $request->validate([
            'lesson_id' => 'required|exists:lessons,id',
            'role' => 'required|in:monitor,fotografo',
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
                $availability = $this->availabilityService->evaluate($startsAt, $endsAt, $projectedPartySize);
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
        $availability = $this->availabilityService->evaluate($startsAt, $endsAt, $projectedPartySize);
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
            'max_slots' => $validated['max_slots'] ?? 6,
            'description' => $validated['description'] ?? null,
            'location' => $location,
            'is_private' => $modality === Lesson::MODALITY_PARTICULAR,
        ]);

        return back()->with('success', 'Clase creada.');
    }

    /**
     * Actualizar clase (description, location, etc.).
     */
    public function update(Request $request, Lesson $lesson)
    {
        $validated = $request->validate([
            'description' => 'nullable|string|max:500',
            'location' => 'nullable|string|max:150',
            'internal_notes' => 'nullable|string|max:1000',
        ]);

        $lesson->update(array_filter($validated, fn ($v) => $v !== null));

        return back()->with('success', 'Clase actualizada.');
    }

    /**
     * Confirmar solicitud (pending → confirmed). Admin comprueba pago.
     */
    public function confirmEnrollment(int $enrollmentId)
    {
        $enrollment = LessonUser::with('user', 'lesson')->findOrFail($enrollmentId);
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

            $availability = $this->availabilityService->evaluate(
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
        $start = $date->copy()->startOfDay();
        $end = $date->copy()->endOfDay();
        Lesson::query()
            ->where('modality', 'vip')
            ->where('status', Lesson::STATUS_SCHEDULED)
            ->whereBetween('starts_at', [$start, $end])
            ->get(['id', 'starts_at', 'ends_at', 'max_slots', 'max_capacity'])
            ->each(function (Lesson $lesson): void {
                $evaluation = $this->availabilityService->evaluate(
                    $lesson->starts_at,
                    $lesson->ends_at,
                    1,
                    (int) $lesson->id
                );
                $capacity = (int) ($evaluation['max_capacity'] ?? 0);
                if ((int) ($lesson->max_slots ?? 0) !== $capacity || (int) ($lesson->max_capacity ?? 0) !== $capacity) {
                    $lesson->update([
                        'max_slots' => $capacity,
                        'max_capacity' => $capacity,
                    ]);
                }
            });
    }

    /**
     * Rechazar justificante: cancelar solicitud y guardar motivo.
     */
    public function rejectEnrollmentProof(Request $request, int $enrollmentId)
    {
        $validated = $request->validate([
            'admin_notes' => 'nullable|string|max:2000',
        ]);

        $enrollment = LessonUser::findOrFail($enrollmentId);
        if ($enrollment->status !== LessonUser::STATUS_PENDING) {
            return back()->with('error', 'Solo se pueden revisar solicitudes pendientes.');
        }

        if (! empty($enrollment->payment_proof_path) && Storage::disk('local')->exists($enrollment->payment_proof_path)) {
            Storage::disk('local')->delete($enrollment->payment_proof_path);
        }

        $enrollment->update([
            'status' => LessonUser::STATUS_CANCELLED,
            'payment_status' => LessonUser::PAYMENT_PENDING,
            'payment_proof_path' => null,
            'proof_uploaded_at' => null,
            'payment_method' => null,
            'admin_notes' => $validated['admin_notes'] ?? 'Justificante rechazado.',
            'cancelled_at' => BusinessDateTime::now(),
        ]);

        return back()->with('success', 'Justificante rechazado y solicitud cancelada.');
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
}
