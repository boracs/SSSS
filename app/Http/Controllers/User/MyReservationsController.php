<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Models\BonoConsumption;
use App\Models\Booking;
use App\Models\LessonUser;
use App\Models\UserBono;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class MyReservationsController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $isVip = (bool) ($user->is_vip ?? false);
        $bonoMonth = (string) $request->query('bono_month', now()->format('Y-m'));
        $loadHistory = $request->boolean('load_history', false);

        $classRows = LessonUser::query()
            ->with(['lesson:id,title,starts_at,level,modality,location'])
            ->where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->limit(120)
            ->get()
            ->map(function (LessonUser $row) {
                $startAt = $row->lesson?->starts_at;
                $canCancel = $startAt ? now()->diffInHours($startAt, false) > 24 : false;

                return [
                    'id' => $row->id,
                    'type' => 'class',
                    'title' => $row->lesson?->title ?: 'Clase de surf',
                    'level' => $row->lesson?->level,
                    'modality' => $row->lesson?->modality ?: 'grupal',
                    'location' => $row->lesson?->location ?: 'Zurriola',
                    'status' => $row->status,
                    'payment_status' => $row->payment_status ?: LessonUser::PAYMENT_PENDING,
                    'created_at' => $row->created_at?->toIso8601String(),
                    'start_time' => $startAt?->toIso8601String(),
                    'has_proof' => ! empty($row->payment_proof_path),
                    'can_cancel' => $canCancel,
                    'cancel_block_reason' => $canCancel ? null : 'Fuera de plazo de cancelación (requiere 24h de antelación)',
                ];
            })
            ->values();

        $rentalRows = Booking::query()
            ->with(['surfboard:id,name'])
            ->where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->limit(120)
            ->get()
            ->map(function (Booking $row) {
                $startAt = $row->start_date;
                $canCancel = $startAt ? now()->diffInHours($startAt, false) > 24 : false;

                return [
                    'id' => $row->id,
                    'type' => 'rental',
                    'title' => $row->surfboard?->name ? 'Alquiler · '.$row->surfboard->name : 'Alquiler de tabla',
                    'status' => $row->status,
                    'payment_status' => $row->payment_status ?: Booking::PAYMENT_PENDING,
                    'created_at' => $row->created_at?->toIso8601String(),
                    'start_time' => $startAt?->toIso8601String(),
                    'end_time' => $row->end_date?->toIso8601String(),
                    'amount' => (float) ($row->deposit_amount ?? 0),
                    'has_proof' => ! empty($row->payment_proof_path),
                    'can_cancel' => $canCancel,
                    'cancel_block_reason' => $canCancel ? null : 'Fuera de plazo de cancelación (requiere 24h de antelación)',
                ];
            })
            ->values();

        $bonoRows = UserBono::query()
            ->with('pack:id,nombre,num_clases,precio')
            ->where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->limit(120)
            ->get()
            ->map(fn (UserBono $row) => [
                'id' => $row->id,
                'type' => 'bono',
                'title' => $row->pack?->nombre ?: 'Bono VIP',
                'num_clases' => (int) ($row->pack?->num_clases ?? 0),
                'clases_restantes' => (int) $row->clases_restantes,
                'status' => $row->status,
                'created_at' => $row->created_at?->toIso8601String(),
                'price' => (float) ($row->pack?->precio ?? 0),
            ])
            ->values();

        $performanceData = [
            'activeBono' => null,
            'history' => null,
            'history_loaded' => false,
            'history_count' => 0,
            'attendanceMap' => [],
            'prediction' => null,
            'stats' => [
                'total_surfed_hours' => 0,
                'solo_ratio_percent' => 0,
                'level_progress' => 'Iniciación',
            ],
        ];

        if ($isVip) {
            $activeBono = UserBono::query()
                ->with('pack:id,nombre,num_clases,precio')
                ->where('user_id', $user->id)
                ->where('status', UserBono::STATUS_CONFIRMED)
                ->orderByDesc('id')
                ->first();

            $history = BonoConsumption::query()
                ->with([
                    'lesson:id,title,starts_at,ends_at,level,location,internal_notes',
                    'lesson.enrollments' => function ($q) {
                        $q->with('user:id,nombre,apellido')
                            ->select('id', 'lesson_id', 'user_id', 'status');
                    },
                ])
                ->where('user_id', $user->id)
                ->orderByDesc('consumed_at')
                ->limit(180)
                ->get();

            $historyMapped = $history->map(function (BonoConsumption $c) {
                $lesson = $c->lesson;
                $participants = collect($lesson?->enrollments ?? [])
                    ->whereIn('status', [LessonUser::STATUS_CONFIRMED, LessonUser::STATUS_ENROLLED, LessonUser::STATUS_ATTENDED])
                    ->values();
                $totalParticipants = (int) $participants->count();
                $ucCost = $totalParticipants <= 1 ? 2 : 1; // Premium Solo = 2 UC
                $crew = $participants->map(function ($e) {
                    $name = trim(($e->user->nombre ?? '').' '.($e->user->apellido ?? ''));
                    $initials = collect(explode(' ', trim($name)))->filter()->take(2)->map(fn ($p) => mb_substr($p, 0, 1))->implode('');
                    return [
                        'name' => $name ?: 'Alumno',
                        'initials' => strtoupper($initials ?: 'A'),
                    ];
                })->values();

                return [
                    'id' => $c->id,
                    'consumed_at' => $c->consumed_at?->toIso8601String(),
                    'remaining_after' => (int) $c->remaining_after,
                    'uc_cost' => $ucCost,
                    'lesson' => [
                        'id' => $lesson?->id,
                        'title' => $lesson?->title ?: 'Sesión de surf',
                        'starts_at' => $lesson?->starts_at?->toIso8601String(),
                        'ends_at' => $lesson?->ends_at?->toIso8601String(),
                        'level' => $lesson?->level ?: 'iniciacion',
                        'spot' => $lesson?->location ?: 'Zurriola',
                        'monitor_note' => $lesson?->internal_notes,
                        'participants_total' => $totalParticipants,
                    ],
                    'crew' => $crew,
                    'crew_overflow' => 0,
                ];
            })->values();

            $lastMonth = now()->subDays(30);
            $lastMonthSessions = $history->filter(fn ($h) => $h->consumed_at && $h->consumed_at->gte($lastMonth))->count();
            $weeklyRate = $lastMonthSessions > 0 ? ($lastMonthSessions / 4.2857) : 0;
            $estimatedWeeks = ($activeBono && $weeklyRate > 0) ? ((int) ceil(((int) $activeBono->clases_restantes) / $weeklyRate)) : null;
            $estimatedEndDate = $estimatedWeeks ? now()->addWeeks($estimatedWeeks)->format('d/m/Y') : null;

            $attendanceMap = $historyMapped->map(function ($row) {
                $date = $row['lesson']['starts_at'] ?: $row['consumed_at'];
                return [
                    'date' => $date ? date('Y-m-d', strtotime($date)) : null,
                    'uc_cost' => $row['uc_cost'],
                    'lesson' => $row['lesson'],
                    'crew' => $row['crew'],
                    'crew_overflow' => $row['crew_overflow'],
                ];
            })->filter(fn ($r) => ! empty($r['date']))->values();

            $attendanceMap = $attendanceMap
                ->filter(fn ($r) => str_starts_with((string) ($r['date'] ?? ''), $bonoMonth))
                ->values();

            $historyMappedAll = $historyMapped->values();

            $totalHours = $historyMappedAll->sum(function ($r) {
                $start = ! empty($r['lesson']['starts_at']) ? strtotime($r['lesson']['starts_at']) : null;
                $end = ! empty($r['lesson']['ends_at']) ? strtotime($r['lesson']['ends_at']) : null;
                if (! $start || ! $end || $end <= $start) return 1.5;
                return round(($end - $start) / 3600, 2);
            });
            $soloCount = $historyMappedAll->where('uc_cost', 2)->count();
            $soloRatio = $historyMappedAll->count() > 0 ? (int) round(($soloCount * 100) / $historyMappedAll->count()) : 0;

            $levelRank = ['iniciacion' => 1, 'intermedio' => 2, 'avanzado' => 3];
            $maxLevel = 'iniciacion';
            foreach ($historyMappedAll as $r) {
                $l = strtolower((string) ($r['lesson']['level'] ?? 'iniciacion'));
                if (($levelRank[$l] ?? 1) > ($levelRank[$maxLevel] ?? 1)) {
                    $maxLevel = $l;
                }
            }

            $performanceData = [
                'activeBono' => $activeBono ? [
                    'id' => $activeBono->id,
                    'name' => $activeBono->pack?->nombre ?: 'Bono VIP',
                    'num_classes' => (int) ($activeBono->pack?->num_clases ?? 0),
                    'remaining' => (int) $activeBono->clases_restantes,
                    'price' => (float) ($activeBono->pack?->precio ?? 0),
                ] : null,
                'history' => $loadHistory ? $historyMappedAll->all() : null,
                'history_loaded' => $loadHistory,
                'history_count' => (int) $historyMappedAll->count(),
                'attendanceMap' => $attendanceMap,
                'prediction' => $estimatedEndDate
                    ? "Al ritmo actual, tu bono durará hasta el {$estimatedEndDate}"
                    : 'Necesitamos más sesiones para estimar tu ritmo.',
                'stats' => [
                    'total_surfed_hours' => round((float) $totalHours, 1),
                    'solo_ratio_percent' => $soloRatio,
                    'level_progress' => ucfirst($maxLevel),
                ],
                'month' => $bonoMonth,
            ];
        }

        // Modo demo/fake para pruebas visuales del Dashboard VIP.
        $displayName = strtolower((string) ($user->nombre ?? $user->name ?? ''));
        if ($displayName === 'alumnovip') {
            $allAttendance = [
                [
                    'date' => '2026-03-02',
                    'uc_cost' => 1,
                    'lesson' => [
                        'title' => 'Sesión Grupal',
                        'starts_at' => '2026-03-02T10:00:00',
                        'ends_at' => '2026-03-02T12:00:00',
                        'level' => 'Iniciación',
                        'spot' => 'Zurriola',
                        'monitor_note' => 'Monitor Borja · Técnica base consolidada.',
                    ],
                    'crew' => [
                        ['name' => 'Alumno A', 'initials' => 'AA'],
                        ['name' => 'Alumno B', 'initials' => 'AB'],
                        ['name' => 'Alumno C', 'initials' => 'AC'],
                            ['name' => 'Alumno D', 'initials' => 'AD'],
                            ['name' => 'Alumno E', 'initials' => 'AE'],
                    ],
                        'crew_overflow' => 0,
                ],
                [
                    'date' => '2026-03-05',
                    'uc_cost' => 1,
                    'lesson' => [
                        'title' => 'Sesión Grupal',
                        'starts_at' => '2026-03-05T10:00:00',
                        'ends_at' => '2026-03-05T12:00:00',
                        'level' => 'Iniciación',
                        'spot' => 'Zurriola',
                        'monitor_note' => 'Monitor Borja · Mejor control de tabla.',
                    ],
                    'crew' => [
                        ['name' => 'Alumno D', 'initials' => 'AD'],
                        ['name' => 'Alumno E', 'initials' => 'AE'],
                        ['name' => 'Alumno F', 'initials' => 'AF'],
                            ['name' => 'Alumno G', 'initials' => 'AG'],
                            ['name' => 'Alumno H', 'initials' => 'AH'],
                    ],
                        'crew_overflow' => 0,
                ],
                [
                    'date' => '2026-03-09',
                    'uc_cost' => 1,
                    'lesson' => [
                        'title' => 'Sesión Grupal',
                        'starts_at' => '2026-03-09T10:00:00',
                        'ends_at' => '2026-03-09T12:00:00',
                        'level' => 'Iniciación',
                        'spot' => 'Zurriola',
                        'monitor_note' => 'Monitor Borja · Timing de takeoff mejorado.',
                    ],
                    'crew' => [
                        ['name' => 'Alumno G', 'initials' => 'AG'],
                        ['name' => 'Alumno H', 'initials' => 'AH'],
                        ['name' => 'Alumno I', 'initials' => 'AI'],
                            ['name' => 'Alumno J', 'initials' => 'AJ'],
                            ['name' => 'Alumno K', 'initials' => 'AK'],
                    ],
                        'crew_overflow' => 0,
                ],
                [
                    'date' => '2026-03-12',
                    'uc_cost' => 1,
                    'lesson' => [
                        'title' => 'Sesión Grupal',
                        'starts_at' => '2026-03-12T10:00:00',
                        'ends_at' => '2026-03-12T12:00:00',
                        'level' => 'Iniciación',
                        'spot' => 'Zurriola',
                        'monitor_note' => 'Monitor Borja · Mayor lectura del pico.',
                    ],
                    'crew' => [
                        ['name' => 'Alumno J', 'initials' => 'AJ'],
                        ['name' => 'Alumno K', 'initials' => 'AK'],
                        ['name' => 'Alumno L', 'initials' => 'AL'],
                            ['name' => 'Alumno M', 'initials' => 'AM'],
                            ['name' => 'Alumno N', 'initials' => 'AN'],
                    ],
                        'crew_overflow' => 0,
                ],
                [
                    'date' => '2026-03-16',
                    'uc_cost' => 2,
                    'lesson' => [
                        'title' => 'Sesión Individual',
                        'starts_at' => '2026-03-16T11:00:00',
                        'ends_at' => '2026-03-16T13:00:00',
                        'level' => 'Intermedio',
                        'spot' => 'Zurriola',
                        'monitor_note' => 'Monitor Borja · Trabajo técnico personalizado.',
                    ],
                    'crew' => [
                        ['name' => 'Tú', 'initials' => 'YO'],
                    ],
                    'crew_overflow' => 0,
                ],
                [
                    'date' => '2026-03-19',
                    'uc_cost' => 2,
                    'lesson' => [
                        'title' => 'Sesión Individual',
                        'starts_at' => '2026-03-19T11:00:00',
                        'ends_at' => '2026-03-19T13:00:00',
                        'level' => 'Intermedio',
                        'spot' => 'Zurriola',
                        'monitor_note' => 'Monitor Borja · Línea y velocidad en pared.',
                    ],
                    'crew' => [
                        ['name' => 'Tú', 'initials' => 'YO'],
                    ],
                    'crew_overflow' => 0,
                ],
            ];

            $allHistory = [
                ['id' => 3001, 'uc_cost' => 1, 'remaining_after' => 19, 'lesson' => ['title' => 'Sesión Grupal', 'starts_at' => '2026-03-02T10:00:00']],
                ['id' => 3002, 'uc_cost' => 1, 'remaining_after' => 18, 'lesson' => ['title' => 'Sesión Grupal', 'starts_at' => '2026-03-05T10:00:00']],
                ['id' => 3003, 'uc_cost' => 1, 'remaining_after' => 17, 'lesson' => ['title' => 'Sesión Grupal', 'starts_at' => '2026-03-09T10:00:00']],
                ['id' => 3004, 'uc_cost' => 1, 'remaining_after' => 16, 'lesson' => ['title' => 'Sesión Grupal', 'starts_at' => '2026-03-12T10:00:00']],
                ['id' => 3005, 'uc_cost' => 2, 'remaining_after' => 14, 'lesson' => ['title' => 'Sesión Individual', 'starts_at' => '2026-03-16T11:00:00']],
                ['id' => 3006, 'uc_cost' => 2, 'remaining_after' => 12, 'lesson' => ['title' => 'Sesión Individual', 'starts_at' => '2026-03-19T11:00:00']],
            ];

            $filteredAttendance = collect($allAttendance)
                ->filter(fn ($r) => str_starts_with((string) ($r['date'] ?? ''), $bonoMonth))
                ->values()
                ->all();

            $performanceData = [
                'activeBono' => [
                    'id' => 9991,
                    'name' => 'Pack 20 Clases',
                    'num_classes' => 20,
                    'remaining' => 8,
                    'price' => 0,
                    'created_at' => '2026-02-15 10:00:00',
                    'consumed' => 12,
                ],
                'prediction' => 'Al ritmo actual, tu bono durará hasta el 15 de abril de 2026',
                'stats' => [
                    'total_surfed_hours' => 24.0,
                    'solo_ratio_percent' => 25,
                    'level_progress' => 'Intermedio Avanzado',
                ],
                'attendanceMap' => $filteredAttendance,
                'history' => $loadHistory ? $allHistory : null,
                'history_loaded' => $loadHistory,
                'history_count' => count($allHistory),
                'month' => $bonoMonth,
            ];
        }

        return Inertia::render('User/Dashboard/MyReservations', [
            'classRows' => $classRows,
            'rentalRows' => $rentalRows,
            'bonoRows' => $bonoRows,
            'performanceData' => $performanceData,
        ]);
    }

    public function uploadClassProof(Request $request, LessonUser $enrollment)
    {
        if ((int) $enrollment->user_id !== (int) $request->user()->id) {
            abort(403);
        }

        $request->validate([
            'proof' => 'required|file|mimes:jpeg,jpg,png,gif,webp,pdf|max:10240',
            'payment_method' => 'nullable|in:bizum,transferencia',
        ]);

        $oldPath = $enrollment->payment_proof_path;
        if ($oldPath && Storage::disk('local')->exists($oldPath)) {
            Storage::disk('local')->delete($oldPath);
        }

        $path = $request->file('proof')->store('lesson-proofs/'.$enrollment->id, 'local');
        $enrollment->update([
            'payment_proof_path' => $path,
            'proof_uploaded_at' => now(),
            'payment_method' => $request->input('payment_method'),
            'payment_status' => LessonUser::PAYMENT_SUBMITTED,
        ]);

        return back()->with('success', 'Justificante de clase subido correctamente.');
    }

    public function uploadRentalProof(Request $request, Booking $booking)
    {
        if ((int) $booking->user_id !== (int) $request->user()->id) {
            abort(403);
        }

        $request->validate([
            'proof' => 'required|file|mimes:jpeg,jpg,png,gif,webp,pdf|max:10240',
            'payment_method' => 'nullable|in:bizum,transferencia',
        ]);

        $oldPath = $booking->payment_proof_path;
        if ($oldPath && Storage::disk('local')->exists($oldPath)) {
            Storage::disk('local')->delete($oldPath);
        }

        $path = $request->file('proof')->store('rental-proofs/'.$booking->id, 'local');
        $booking->update([
            'payment_proof_path' => $path,
            'proof_uploaded_at' => now(),
            'payment_method' => $request->input('payment_method'),
            'payment_status' => Booking::PAYMENT_SUBMITTED,
            'status' => Booking::STATUS_PENDING,
        ]);

        return back()->with('success', 'Justificante de alquiler subido correctamente.');
    }

    public function cancelClass(Request $request, LessonUser $enrollment)
    {
        if ((int) $enrollment->user_id !== (int) $request->user()->id) {
            abort(403);
        }

        $enrollment->loadMissing('lesson:id,starts_at');
        $startAt = $enrollment->lesson?->starts_at;
        if (! $startAt || now()->diffInHours($startAt, false) <= 24) {
            return back()->with('error', 'Fuera de plazo de cancelación (requiere 24h de antelación).');
        }

        $enrollment->update([
            'status' => LessonUser::STATUS_CANCELLED,
            'cancelled_at' => now(),
        ]);

        return back()->with('success', 'Reserva de clase cancelada y plaza liberada.');
    }

    public function cancelRental(Request $request, Booking $booking)
    {
        if ((int) $booking->user_id !== (int) $request->user()->id) {
            abort(403);
        }

        if (! $booking->start_date || now()->diffInHours($booking->start_date, false) <= 24) {
            return back()->with('error', 'Fuera de plazo de cancelación (requiere 24h de antelación).');
        }

        $booking->update([
            'status' => Booking::STATUS_CANCELLED,
        ]);

        return back()->with('success', 'Reserva de alquiler cancelada.');
    }
}

