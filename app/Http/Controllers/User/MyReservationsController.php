<?php

declare(strict_types=1);

namespace App\Http\Controllers\User;

use App\Actions\Academy\CancelEnrollmentAction;
use App\Actions\Academy\UploadLessonProofAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Academy\UploadLessonProofRequest;
use App\Http\Requests\User\CancelLessonEnrollmentRequest;
use App\Models\Booking;
use App\Models\LessonUser;
use App\Services\VipStudentPerformanceService;
use App\Support\BusinessDateTime;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class MyReservationsController extends Controller
{
    public function __construct(
        private readonly UploadLessonProofAction $uploadLessonProofAction,
        private readonly CancelEnrollmentAction $cancelEnrollmentAction,
    ) {}

    public function index(Request $request)
    {
        $user = $request->user();
        $isVip = (bool) ($user->is_vip ?? false);
        $bonoMonth = (string) $request->query('bono_month', now()->format('Y-m'));
        $loadHistory = $request->boolean('load_history', false);
        $rows = VipStudentPerformanceService::buildReservationRows($user);
        $classRows = $rows['classRows'];
        $rentalRows = $rows['rentalRows'];
        $bonoRows = $rows['bonoRows'];

        $performanceData = [
            'subject_user_id' => (int) $user->id,
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
            'month' => $bonoMonth,
        ];

        if ($isVip) {
            $performanceData = VipStudentPerformanceService::buildPerformanceDataForSubject($user, $bonoMonth, $loadHistory, false);
        } else {
            $performanceData = VipStudentPerformanceService::buildPerformanceData($user, $bonoMonth, $loadHistory, false);
        }

        $waDigits = preg_replace('/\D+/', '', (string) config('services.academy.whatsapp_number', ''));

        return Inertia::render('User/Dashboard/MyReservations', [
            'classRows' => $classRows,
            'rentalRows' => $rentalRows,
            'bonoRows' => $bonoRows,
            'performanceData' => $performanceData,
            'isAdminView' => false,
            'targetUser' => null,
            'analysisNav' => null,
            'paymentIban' => config('services.academy.iban', '[IBAN]'),
            'paymentBizumNumber' => config('services.academy.bizum_number', '[BIZUM_NUMBER]'),
            'whatsappHelpUrl' => $waDigits !== '' ? 'https://wa.me/'.$waDigits : null,
        ]);
    }

    public function uploadClassProof(UploadLessonProofRequest $request, LessonUser $enrollment)
    {
        try {
            $this->authorize('uploadProof', $enrollment);
        } catch (AuthorizationException) {
            return back()->with('error', 'No tienes permiso para subir un justificante en esta reserva.');
        }

        $result = $this->uploadLessonProofAction->execute(
            $enrollment,
            $request->proofFile(),
            $request->paymentMethod(),
        );

        return $result['ok']
            ? back()->with('success', $result['message'])
            : back()->with('error', $result['message']);
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
            'payment_status' => Booking::PAYMENT_PENDING,
            'status' => Booking::STATUS_PENDING,
        ]);

        return back()->with('success', 'Justificante de alquiler subido correctamente.');
    }

    public function cancelClass(CancelLessonEnrollmentRequest $request, LessonUser $enrollment)
    {
        try {
            $this->authorize('cancel', $enrollment);
        } catch (AuthorizationException) {
            return back()->with('error', 'No tienes permiso para cancelar esta reserva.');
        }

        $result = $this->cancelEnrollmentAction->execute($enrollment, $request->latePolicy());

        return $result['ok']
            ? back()->with('success', $result['message'])
            : back()->with('error', $result['message']);
    }

    public function cancelRental(Request $request, Booking $booking)
    {
        if ((int) $booking->user_id !== (int) $request->user()->id) {
            abort(403);
        }

        if ($booking->status === Booking::STATUS_CANCELLED) {
            return back()->with('error', 'Esta reserva ya estaba cancelada.');
        }

        if (($booking->payment_status ?? '') === Booking::PAYMENT_PENDING
            && $booking->created_at
            && $booking->created_at->copy()->addMinutes(30)->isPast()) {
            return back()->with('error', 'La sesión de pago ha expirado; esta reserva ya no se puede cancelar desde aquí.');
        }

        if (! $booking->start_date || BusinessDateTime::now()->diffInHours($booking->start_date, false) <= 24) {
            return back()->with('error', 'Fuera de plazo de cancelación (requiere 24h de antelación).');
        }

        $hadRefundQueue = $booking->needsRefundReviewAfterCancellation();
        $booking->applyCancellationWithRefundQueue();

        $msg = $hadRefundQueue
            ? 'Reserva cancelada. Si ya habías abonado un importe, el club tramitará la devolución; el equipo administrativo ha sido notificado.'
            : 'Reserva de alquiler cancelada.';

        return back()->with('success', $msg);
    }
}

