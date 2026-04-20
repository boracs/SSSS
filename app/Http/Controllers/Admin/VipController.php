<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreAttendanceNoteRequest;
use App\Models\AttendanceNote;
use App\Models\Lesson;
use App\Models\LessonUser;
use App\Models\User;
use App\Models\UserBono;
use App\Services\VipLoyaltyService;
use App\Services\VipStudentPerformanceService;
use App\Support\BusinessDateTime;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class VipController extends Controller
{
    public function index(Request $request, VipLoyaltyService $loyalty): Response
    {
        $health = (string) $request->query('health', 'all');
        if (! in_array($health, ['all', 'active', 'drifting', 'inactive'], true)) {
            $health = 'all';
        }
        $renewalOnly = $request->boolean('renewal_only');
        $search = trim((string) $request->query('search', ''));

        $maxTsBindings = [
            LessonUser::PAYMENT_CONFIRMED,
            LessonUser::STATUS_CANCELLED,
            LessonUser::STATUS_REFUNDED,
            LessonUser::STATUS_EXPIRED,
        ];
        $maxTsSql = '(SELECT MAX(COALESCE(lesson_user.confirmed_at, lesson_user.updated_at)) FROM lesson_user WHERE lesson_user.user_id = users.id AND lesson_user.payment_status = ? AND lesson_user.status NOT IN (?,?,?))';

        $lastLessonSub = DB::table('lesson_user')
            ->selectRaw('MAX(COALESCE(confirmed_at, updated_at))')
            ->whereColumn('lesson_user.user_id', 'users.id')
            ->where('payment_status', LessonUser::PAYMENT_CONFIRMED)
            ->whereNotIn('status', [
                LessonUser::STATUS_CANCELLED,
                LessonUser::STATUS_REFUNDED,
                LessonUser::STATUS_EXPIRED,
            ]);

        $minBonoSub = DB::table('user_bonos')
            ->selectRaw('MIN(clases_restantes)')
            ->whereColumn('user_bonos.user_id', 'users.id')
            ->where('status', UserBono::STATUS_CONFIRMED);

        $query = User::query()
            ->where('is_vip', true)
            ->select('users.*')
            ->selectSub($lastLessonSub, 'last_confirmed_reservation_at')
            ->selectSub($minBonoSub, 'min_remaining_classes')
            ->with(['latestAttendanceNote' => function ($q) {
                $q->select(['id', 'user_id', 'body', 'created_at', 'is_visible_to_student', 'admin_id']);
            }]);

        if ($search !== '') {
            $query->where(function (Builder $q) use ($search) {
                $q->where('nombre', 'like', "%{$search}%")
                    ->orWhere('apellido', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($renewalOnly) {
            $query->needsRenewal();
        }

        if ($health === 'active') {
            $query->whereRaw("{$maxTsSql} IS NOT NULL AND DATEDIFF(NOW(), {$maxTsSql}) < 10", [
                ...$maxTsBindings,
                ...$maxTsBindings,
            ]);
        } elseif ($health === 'drifting') {
            $query->whereRaw("{$maxTsSql} IS NOT NULL AND DATEDIFF(NOW(), {$maxTsSql}) >= 10 AND DATEDIFF(NOW(), {$maxTsSql}) <= 25", [
                ...$maxTsBindings,
                ...$maxTsBindings,
                ...$maxTsBindings,
            ]);
        } elseif ($health === 'inactive') {
            $query->where(function (Builder $q) use ($maxTsSql, $maxTsBindings) {
                $q->whereRaw("{$maxTsSql} IS NULL", $maxTsBindings)
                    ->orWhereRaw("DATEDIFF(NOW(), {$maxTsSql}) > 25", [...$maxTsBindings]);
            });
        }

        $users = $query
            ->orderBy('nombre')
            ->orderBy('apellido')
            ->limit(500)
            ->get();

        $vips = $users->map(function (User $u) use ($loyalty) {
            $raw = $u->last_confirmed_reservation_at;
            $lastAt = $raw ? BusinessDateTime::parseInAppTimezone((string) $raw) : null;
            $minRem = $u->min_remaining_classes;

            return [
                'id' => $u->id,
                'nombre' => $u->nombre,
                'apellido' => $u->apellido,
                'email' => $u->email,
                'last_confirmed_reservation_at' => $lastAt ? BusinessDateTime::toApi($lastAt) : null,
                'health' => $loyalty->healthFromLastActivity($lastAt),
                'days_since_activity' => $loyalty->daysSinceLastActivity($lastAt),
                'min_remaining_classes' => $minRem !== null ? (int) $minRem : null,
                'needs_renewal' => $minRem !== null && (int) $minRem <= 3,
                'whatsapp_action_url' => route('admin.vips.whatsapp', $u),
                'latest_note' => $u->latestAttendanceNote
                    ? [
                        'body' => $u->latestAttendanceNote->body,
                        'created_at' => $u->latestAttendanceNote->created_at?->toIso8601String(),
                        'is_visible_to_student' => (bool) $u->latestAttendanceNote->is_visible_to_student,
                    ]
                    : null,
            ];
        })->values();

        $baseVip = User::query()->where('is_vip', true);
        $counts = [
            'needsRenewal' => (clone $baseVip)->needsRenewal()->count(),
            'health' => [
                'active' => $this->countVipHealth($maxTsSql, $maxTsBindings, 'active'),
                'drifting' => $this->countVipHealth($maxTsSql, $maxTsBindings, 'drifting'),
                'inactive' => $this->countVipHealth($maxTsSql, $maxTsBindings, 'inactive'),
            ],
        ];

        return Inertia::render('Admin/Vips/Index', [
            'vips' => $vips,
            'counts' => $counts,
            'filters' => [
                'health' => $health,
                'renewal_only' => $renewalOnly,
                'search' => $search,
            ],
        ]);
    }

    public function analysis(Request $request, User $user): Response
    {
        abort_unless($user->is_vip, 404);
        Gate::authorize('manage-vips');

        $claimedTargetId = $request->query('target_user_id');
        if ($claimedTargetId === null || $claimedTargetId === '' || ! is_numeric($claimedTargetId)) {
            abort(400, 'Falta target_user_id válido en el contexto de análisis.');
        }
        if ((int) $claimedTargetId !== (int) $user->id) {
            abort(403, 'Conflicto de contexto: target_user_id no coincide con el alumno de la ruta.');
        }

        $bonoMonth = (string) $request->query('bono_month', BusinessDateTime::now()->format('Y-m'));
        $loadHistory = $request->boolean('load_history', false);

        $rows = VipStudentPerformanceService::buildReservationRows($user);
        $performanceData = VipStudentPerformanceService::buildPerformanceDataForSubject($user, $bonoMonth, $loadHistory, false);
        Log::info('vip.analysis.payload', [
            'target_user_id' => (int) $user->id,
            'subject_user_id' => (int) ($performanceData['subject_user_id'] ?? 0),
            'remaining_uc' => $performanceData['activeBono']['remaining_uc'] ?? null,
            'active_bono_name' => $performanceData['activeBono']['name'] ?? null,
            'month' => $bonoMonth,
            'history_loaded' => (bool) ($performanceData['history_loaded'] ?? false),
        ]);

        $from = (string) $request->query('from', 'vips');
        $from = in_array($from, ['vips', 'users'], true) ? $from : 'vips';

        return Inertia::render('User/Dashboard/MyReservations', [
            'classRows' => $rows['classRows'],
            'rentalRows' => $rows['rentalRows'],
            'bonoRows' => $rows['bonoRows'],
            'performanceData' => $performanceData,
            'isAdminView' => true,
            'targetUser' => [
                'id' => $user->id,
                'nombre' => $user->nombre,
                'apellido' => $user->apellido,
            ],
            'analysisNav' => [
                'from' => $from,
            ],
        ]);
    }

    public function storeNote(StoreAttendanceNoteRequest $request, VipLoyaltyService $loyalty): \Illuminate\Http\RedirectResponse
    {
        $data = $request->validated();
        $visible = array_key_exists('is_visible_to_student', $data)
            ? (bool) $data['is_visible_to_student']
            : true;
        $userId = (int) $data['user_id'];
        $lessonId = isset($data['lesson_id']) ? (int) $data['lesson_id'] : 0;

        if (($data['reservation_type'] ?? null) === 'lesson_user' || $lessonId > 0) {
            $resolvedLessonUserId = isset($data['reservation_id']) ? (int) $data['reservation_id'] : 0;
            if ($resolvedLessonUserId <= 0 && $lessonId > 0) {
                $lessonExists = Lesson::query()->whereKey($lessonId)->exists();
                abort_if(! $lessonExists, 422, 'La clase seleccionada no existe.');
                $lessonUser = LessonUser::query()->firstOrCreate(
                    [
                        'lesson_id' => $lessonId,
                        'user_id' => $userId,
                    ],
                    [
                        'party_size' => 1,
                        'quantity' => 1,
                        'credits_locked' => 1,
                        'status' => LessonUser::STATUS_CONFIRMED,
                        'payment_status' => LessonUser::PAYMENT_CONFIRMED,
                        'confirmed_at' => BusinessDateTime::now(),
                    ]
                );
                $resolvedLessonUserId = (int) $lessonUser->id;
            }
            if ($resolvedLessonUserId > 0) {
                $data['reservation_type'] = 'lesson_user';
                $data['reservation_id'] = $resolvedLessonUserId;
            }
        }

        $noteId = isset($data['attendance_note_id']) ? (int) $data['attendance_note_id'] : 0;
        if ($noteId > 0) {
            $note = AttendanceNote::query()
                ->whereKey($noteId)
                ->where('user_id', $userId)
                ->first();
            abort_if($note === null, 404);
            $note->update([
                'body' => $loyalty->sanitizeNoteBody($data['body']),
                'is_visible_to_student' => $visible,
                'admin_id' => (int) $request->user()->id,
            ]);
        } else {
            AttendanceNote::query()->create([
                'user_id' => $userId,
                'body' => $loyalty->sanitizeNoteBody($data['body']),
                'is_visible_to_student' => $visible,
                'admin_id' => (int) $request->user()->id,
                'reservation_type' => $data['reservation_type'] ?? null,
                'reservation_id' => isset($data['reservation_id']) ? (int) $data['reservation_id'] : null,
            ]);
        }

        return back()->with('success', 'Nota guardada correctamente.');
    }

    public function whatsapp(User $user): \Illuminate\Http\RedirectResponse
    {
        abort_unless($user->is_vip, 404);
        $digits = preg_replace('/\D/', '', (string) ($user->telefono ?? ''));
        abort_if(strlen($digits) < 9, 404);

        return redirect()->away('https://wa.me/'.$digits);
    }

    private function countVipHealth(string $maxTsSql, array $bindings, string $health): int
    {
        $q = User::query()->where('is_vip', true);

        if ($health === 'active') {
            $q->whereRaw("{$maxTsSql} IS NOT NULL AND DATEDIFF(NOW(), {$maxTsSql}) < 10", [
                ...$bindings,
                ...$bindings,
            ]);
        } elseif ($health === 'drifting') {
            $q->whereRaw("{$maxTsSql} IS NOT NULL AND DATEDIFF(NOW(), {$maxTsSql}) >= 10 AND DATEDIFF(NOW(), {$maxTsSql}) <= 25", [
                ...$bindings,
                ...$bindings,
                ...$bindings,
            ]);
        } else {
            $q->where(function (Builder $sub) use ($maxTsSql, $bindings) {
                $sub->whereRaw("{$maxTsSql} IS NULL", $bindings)
                    ->orWhereRaw("DATEDIFF(NOW(), {$maxTsSql}) > 25", [...$bindings]);
            });
        }

        return $q->count();
    }
}
