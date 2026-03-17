<?php

namespace App\Http\Controllers\Academy;

use App\Http\Controllers\Controller;
use App\Models\Lesson;
use App\Services\CreditEngineService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class LessonController extends Controller
{
    public function __construct(
        protected CreditEngineService $creditEngine
    ) {}

    /**
     * Calendario + feed de clases (Calendar-Pro).
     */
    public function index(Request $request)
    {
        $date = $request->has('date')
            ? Carbon::parse($request->input('date'))
            : Carbon::today();

        $lessons = Lesson::query()
            ->where('status', Lesson::STATUS_SCHEDULED)
            ->whereDate('starts_at', $date)
            ->with(['staffAssignments.user', 'enrollments'])
            ->orderBy('starts_at')
            ->get()
            ->map(fn (Lesson $l) => [
                'id' => $l->id,
                'title' => $l->title,
                'starts_at' => $l->starts_at->toIso8601String(),
                'ends_at' => $l->ends_at->toIso8601String(),
                'level' => $l->level,
                'max_slots' => $l->max_slots,
                'location' => $l->location,
                'is_surf_trip' => $l->is_surf_trip,
                'is_optimal_waves' => $l->is_optimal_waves,
                'enrolled_count' => $l->enrolledCount(),
                'monitor' => $l->monitor() ? [
                    'id' => $l->monitor()->id,
                    'nombre' => $l->monitor()->nombre ?? $l->monitor()->name,
                ] : null,
                'fotografo' => $l->fotografo() ? [
                    'id' => $l->fotografo()->id,
                    'nombre' => $l->fotografo()->nombre ?? $l->fotografo()->name,
                ] : null,
            ]);

        $optimalDates = Lesson::query()
            ->where('status', Lesson::STATUS_SCHEDULED)
            ->where('is_optimal_waves', true)
            ->distinct()
            ->pluck('starts_at')
            ->map(fn ($d) => Carbon::parse($d)->format('Y-m-d'))
            ->unique()
            ->values()
            ->toArray();

        $myEnrollmentLessonIds = [];
        $pendingSurfTripLesson = null;
        if (auth()->id()) {
            $myEnrollmentLessonIds = \App\Models\LessonUser::query()
                ->where('user_id', auth()->id())
                ->whereIn('status', ['enrolled', 'attended'])
                ->pluck('lesson_id')
                ->toArray();

            $pending = \App\Models\LessonUser::query()
                ->where('user_id', auth()->id())
                ->whereIn('status', ['enrolled', 'attended'])
                ->whereNull('surf_trip_confirmed')
                ->whereHas('lesson', fn ($q) => $q->where('is_surf_trip', true))
                ->with('lesson')
                ->first();
            if ($pending && $pending->lesson) {
                $pendingSurfTripLesson = [
                    'id' => $pending->lesson->id,
                    'is_surf_trip' => true,
                    'starts_at' => $pending->lesson->starts_at->toIso8601String(),
                ];
            }
        }

        return Inertia::render('Academy/Index', [
            'lessons' => $lessons,
            'selectedDate' => $date->format('Y-m-d'),
            'optimalDates' => $optimalDates,
            'creditsBalance' => auth()->user()?->credits_balance ?? 0,
            'myEnrollmentLessonIds' => $myEnrollmentLessonIds,
            'pendingSurfTripLesson' => $pendingSurfTripLesson,
        ]);
    }

    /**
     * Inscribirse a una clase (consumirá créditos en la auditoría 1h antes).
     */
    public function enroll(Request $request, Lesson $lesson)
    {
        $user = auth()->user();
        if (! $user) {
            return back()->with('error', 'Debes iniciar sesión.');
        }

        if (! $this->creditEngine->canAffordEnrollment($user, $lesson)) {
            return back()->with('error', 'Créditos insuficientes. Necesitas al menos 2.');
        }

        $exists = $lesson->enrollments()->where('user_id', $user->id)->whereIn('status', ['enrolled', 'attended'])->exists();
        if ($exists) {
            return back()->with('error', 'Ya estás inscrito.');
        }

        $enrolled = $lesson->enrolledCount();
        if ($enrolled >= $lesson->max_slots) {
            return back()->with('error', 'Clase completa.');
        }

        $lesson->users()->attach($user->id, [
            'credits_locked' => 0,
            'status' => \App\Models\LessonUser::STATUS_ENROLLED,
        ]);

        return back()->with('success', 'Inscripción realizada. Los créditos se descontarán 1h antes.');
    }

    /**
     * Cancelar inscripción (política 24h).
     */
    public function cancel(Lesson $lesson)
    {
        $enrollment = $lesson->enrollments()->where('user_id', auth()->id())->first();
        if (! $enrollment) {
            return back()->with('error', 'No estás inscrito.');
        }

        $this->creditEngine->cancelByStudent($enrollment);
        return back()->with('success', 'Inscripción cancelada.');
    }

    /**
     * Confirmar asistencia a nueva ubicación (Surf-Trip) o solicitar reembolso.
     */
    public function confirmSurfTrip(Request $request, Lesson $lesson)
    {
        $confirmed = (bool) $request->input('confirm');
        $enrollment = $lesson->enrollments()->where('user_id', auth()->id())->first();
        if (! $enrollment) {
            return back()->with('error', 'No estás inscrito.');
        }

        $enrollment->update(['surf_trip_confirmed' => $confirmed]);
        if (! $confirmed) {
            $this->creditEngine->refundCredits($enrollment, 'Reembolso: no asistencia a playa secundaria');
        }
        return back()->with('success', $confirmed ? 'Asistencia confirmada.' : 'Reembolso solicitado.');
    }
}
