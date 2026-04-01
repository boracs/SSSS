<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\LessonUser;
use App\Services\VipStudentPerformanceService;
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

        return Inertia::render('User/Dashboard/MyReservations', [
            'classRows' => $classRows,
            'rentalRows' => $rentalRows,
            'bonoRows' => $bonoRows,
            'performanceData' => $performanceData,
            'isAdminView' => false,
            'targetUser' => null,
            'analysisNav' => null,
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

        $validated = $request->validate([
            'late_policy' => 'nullable|in:lose,rescue',
        ]);

        $enrollment->loadMissing('lesson:id,starts_at');
        $startAt = $enrollment->lesson?->starts_at;
        if (! $startAt) {
            return back()->with('error', 'No se pudo determinar la hora de inicio de la clase.');
        }

        if ($startAt->lte(now())) {
            return back()->with('error', 'La clase ya ha comenzado y no puede cancelarse.');
        }

        if ($this->isWithinCancellationWindow($startAt)) {
            $latePolicy = (string) ($validated['late_policy'] ?? 'lose');
            if ($latePolicy === 'rescue') {
                $enrollment->update([
                    'status' => LessonUser::STATUS_CANCELLED_LATE_RESCUED,
                    'cancelled_at' => now(),
                ]);

                return back()->with('success', 'Reserva cancelada con rescate: se aplicarán 30EUR de gestión y recuperas la clase.');
            }

            $enrollment->update([
                'status' => LessonUser::STATUS_CANCELLED_LATE_LOST,
                'cancelled_at' => now(),
            ]);

            return back()->with('success', 'Reserva cancelada fuera de plazo: la clase se considera consumida.');
        }

        $enrollment->update([
            'status' => LessonUser::STATUS_CANCELLED_FREE,
            'cancelled_at' => now(),
        ]);

        return back()->with('success', 'Reserva de clase cancelada dentro de plazo y clase recuperada.');
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

    private function isWithinCancellationWindow($startAt): bool
    {
        return now()->diffInHours($startAt, false) <= 24;
    }
}

