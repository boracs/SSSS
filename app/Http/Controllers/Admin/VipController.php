<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreAttendanceNoteRequest;
use App\Models\AttendanceNote;
use App\Models\Lesson;
use App\Models\LessonUser;
use App\Models\User;
use App\Services\VipLoyaltyService;
use App\Services\VipStudentPerformanceService;
use App\Support\AcademyContact;
use App\Support\BusinessDateTime;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class VipController extends Controller
{
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
                'from' => 'users',
            ],
            'whatsappHelpUrl' => AcademyContact::whatsappBaseUrl(),
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
}
