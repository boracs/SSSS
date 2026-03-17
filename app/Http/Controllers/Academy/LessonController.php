<?php

namespace App\Http\Controllers\Academy;

use App\Http\Controllers\Controller;
use App\Mail\RequestReceivedMail;
use App\Models\Lesson;
use App\Models\LessonUser;
use App\Services\CreditEngineService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
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

        $month = $request->has('month')
            ? Carbon::parse($request->input('month'))->startOfMonth()
            : $date->copy()->startOfMonth();

        // Rango por defecto: desde HOY hasta ~5 meses hacia delante.
        // (Mejor UX para Commander: ves lo relevante desde la fecha actual sin arrastrar días pasados del mes.)
        $rangeStart = $request->has('start')
            ? Carbon::parse($request->input('start'))->startOfDay()
            : $date->copy()->startOfDay();
        $rangeEnd = $request->has('end')
            ? Carbon::parse($request->input('end'))->endOfDay()
            : $date->copy()->addMonthsNoOverflow(5)->endOfDay();

        // Marcar solicitudes PENDING expiradas → EXPIRED (UTC). No borrar filas; Admin puede reactivar.
        LessonUser::query()
            ->where('status', LessonUser::STATUS_PENDING)
            ->whereNotNull('expires_at')
            ->where('expires_at', '<', Carbon::now('UTC'))
            ->update(['status' => LessonUser::STATUS_EXPIRED]);

        $lessonsByDate = Lesson::query()
            ->where('status', Lesson::STATUS_SCHEDULED)
            ->whereBetween('starts_at', [$rangeStart, $rangeEnd])
            ->with(['staffAssignments.user', 'enrollments'])
            ->orderBy('starts_at')
            ->get()
            ->map(function (Lesson $l) {
                $isPrivate = (bool) ($l->is_private ?? false);
                $partyTotal = $l->totalPartySize();
                $hasBig = $l->hasBigGroup();
                return [
                    'id' => $l->id,
                    'date' => $l->starts_at->format('Y-m-d'),
                    'type' => $l->type ?? Lesson::TYPE_SURF,
                    'is_private' => $isPrivate,
                    'title' => $isPrivate ? null : $l->title,
                    'description' => $l->description,
                    'starts_at' => $l->starts_at->toIso8601String(),
                    'ends_at' => $l->ends_at->toIso8601String(),
                    'level' => $l->level,
                    'max_slots' => $l->max_slots,
                    'max_capacity' => $l->max_capacity ?? null,
                    'location' => $l->location ?? 'Zurriola',
                    'is_surf_trip' => $l->is_surf_trip,
                    'is_optimal_waves' => $l->is_optimal_waves,
                    'enrolled_count' => $l->enrolledCount(),
                    'party_size_total' => $partyTotal,
                    'pending_count' => $l->pending_count,
                    'confirmed_count' => $l->confirmed_count,
                    'total_students' => $l->total_students,
                    'monitors_required' => $l->monitorsRequiredFor($partyTotal, $hasBig),
                    'is_full_by_staff' => $l->isStaffFullFor($partyTotal, $hasBig),
                    'monitor' => $l->monitor() ? [
                        'id' => $l->monitor()->id,
                        'nombre' => $l->monitor()->nombre ?? $l->monitor()->name,
                    ] : null,
                    'fotografo' => $l->fotografo() ? [
                        'id' => $l->fotografo()->id,
                        'nombre' => $l->fotografo()->nombre ?? $l->fotografo()->name,
                    ] : null,
                    'price' => $l->price !== null ? (float) $l->price : null,
                    'currency' => $l->currency ?? 'EUR',
                ];
            })
            ->groupBy('date')
            ->map(fn ($items) => $items->values())
            ->toArray();

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
        $myEnrollmentStatusByLesson = [];
        $myEnrollmentExpiresAtByLesson = [];
        $myEnrollmentHasProofByLesson = [];
        $myEnrollmentIdByLesson = [];
        $pendingSurfTripLesson = null;
        if (auth()->id()) {
            $enrollments = \App\Models\LessonUser::query()
                ->where('user_id', auth()->id())
                ->whereIn('status', ['pending', 'confirmed', 'enrolled', 'attended'])
                ->get(['id', 'lesson_id', 'status', 'expires_at', 'payment_proof_path']);
            $myEnrollmentLessonIds = $enrollments->pluck('lesson_id')->toArray();
            $myEnrollmentStatusByLesson = $enrollments->pluck('status', 'lesson_id')->toArray();
            $myEnrollmentExpiresAtByLesson = $enrollments
                ->filter(fn ($e) => $e->expires_at !== null)
                ->mapWithKeys(fn ($e) => [$e->lesson_id => $e->expires_at->toIso8601String()])
                ->toArray();
            $myEnrollmentHasProofByLesson = $enrollments
                ->mapWithKeys(fn ($e) => [$e->lesson_id => ! empty($e->payment_proof_path)])
                ->toArray();
            $myEnrollmentIdByLesson = $enrollments->mapWithKeys(fn ($e) => [$e->lesson_id => $e->id])->toArray();

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
            'selectedDate' => $date->format('Y-m-d'),
            'calendarMonth' => $month->format('Y-m-d'),
            'rangeStart' => $rangeStart->format('Y-m-d'),
            'rangeEnd' => $rangeEnd->format('Y-m-d'),
            'lessonsByDate' => $lessonsByDate,
            'optimalDates' => $optimalDates,
            'creditsBalance' => auth()->user()?->credits_balance ?? 0,
            'myEnrollmentLessonIds' => $myEnrollmentLessonIds,
            'myEnrollmentStatusByLesson' => $myEnrollmentStatusByLesson,
            'myEnrollmentExpiresAtByLesson' => $myEnrollmentExpiresAtByLesson,
            'myEnrollmentHasProofByLesson' => $myEnrollmentHasProofByLesson,
            'myEnrollmentIdByLesson' => $myEnrollmentIdByLesson,
            'pendingSurfTripLesson' => $pendingSurfTripLesson,
            'paymentBizumNumber' => config('services.academy.bizum_number', '[BIZUM_NUMBER]'),
            'paymentIban' => config('services.academy.iban', '[IBAN]'),
            'whatsappHelpUrl' => 'https://wa.me/'.preg_replace('/\D/', '', config('services.academy.whatsapp_number', '34600000000')),
        ]);
    }

    /**
     * Solicitar una clase (workflow: pending -> confirmed -> enrolled).
     * Valida capacidad humana (MAX_STAFF=2, ratio 1:6) y evita race conditions.
     */
    public function requestLesson(Request $request, Lesson $lesson)
    {
        $user = auth()->user();
        if (! $user) {
            return back()->with('error', 'Debes iniciar sesión.');
        }

        $validated = $request->validate([
            'party_size' => 'nullable|integer|min:1|max:12',
        ]);
        $partySize = (int) ($validated['party_size'] ?? 1);

        $enrollment = null;
        try {
            $enrollment = DB::transaction(function () use ($lesson, $user, $partySize) {
                // Lock lesson row to serialize capacity checks
                $lockedLesson = Lesson::query()->whereKey($lesson->id)->lockForUpdate()->firstOrFail();

                $activeStatuses = [
                    LessonUser::STATUS_PENDING,
                    LessonUser::STATUS_CONFIRMED,
                    LessonUser::STATUS_ENROLLED,
                    LessonUser::STATUS_ATTENDED,
                ];

                $existing = LessonUser::query()
                    ->where('lesson_id', $lockedLesson->id)
                    ->where('user_id', $user->id)
                    ->lockForUpdate()
                    ->first();

                if ($existing && in_array($existing->status, $activeStatuses, true)) {
                    throw new \RuntimeException('YA_EXISTE');
                }

                $currentTotal = (int) LessonUser::query()
                    ->where('lesson_id', $lockedLesson->id)
                    ->whereIn('status', $activeStatuses)
                    ->lockForUpdate()
                    ->sum('party_size');

                $currentHasBig = LessonUser::query()
                    ->where('lesson_id', $lockedLesson->id)
                    ->whereIn('status', $activeStatuses)
                    ->where('party_size', '>=', 7)
                    ->lockForUpdate()
                    ->exists();

                $newTotal = $currentTotal + $partySize;
                $hasBig = $currentHasBig || $partySize >= 7;
                $monitors = $lockedLesson->monitorsRequiredFor($newTotal, $hasBig);
                if ($monitors >= 2) {
                    throw new \RuntimeException('COMPLETO_STAFF');
                }

                $capacity = $lockedLesson->max_capacity ?? $lockedLesson->max_slots;
                if ($capacity && $newTotal > (int) $capacity) {
                    throw new \RuntimeException('COMPLETO_CAPACIDAD');
                }

                if ($existing) {
                    $existing->fill([
                        'party_size' => $partySize,
                        'credits_locked' => 0,
                        'status' => LessonUser::STATUS_PENDING,
                        'expires_at' => Carbon::now('UTC')->addHours(3),
                    ])->save();
                    return $existing;
                }

                return LessonUser::create([
                    'lesson_id' => $lockedLesson->id,
                    'user_id' => $user->id,
                    'party_size' => $partySize,
                    'credits_locked' => 0,
                    'status' => LessonUser::STATUS_PENDING,
                    'expires_at' => Carbon::now('UTC')->addHours(3),
                ]);
            });
        } catch (\RuntimeException $e) {
            if ($e->getMessage() === 'YA_EXISTE') {
                return back()->with('error', 'Ya tienes una solicitud activa para esta clase.');
            }
            if ($e->getMessage() === 'COMPLETO_STAFF') {
                return back()->with('error', 'Completo: no hay monitores disponibles para ese horario.');
            }
            if ($e->getMessage() === 'COMPLETO_CAPACIDAD') {
                return back()->with('error', 'Clase completa por capacidad.');
            }
            throw $e;
        }

        if ($enrollment) {
            $enrollment->load('user', 'lesson');
            Mail::to($user->email)->send(new RequestReceivedMail(
                $enrollment,
                $lesson,
                config('services.academy.iban', '[IBAN]'),
                config('services.academy.bizum_number', '[BIZUM_NUMBER]'),
                url()->route('profile.edit')
            ));
        }

        return back()
            ->with('success', '¡Solicitud recibida! Hemos bloqueado tu plaza durante 3h.')
            ->with('payment_lesson_id', $lesson->id);
    }

    /**
     * Subir comprobante de pago para una solicitud PENDING. Se guarda en storage privado.
     */
    public function uploadProof(Request $request, Lesson $lesson)
    {
        $user = auth()->user();
        if (! $user) {
            return back()->with('error', 'Debes iniciar sesión.');
        }

        $enrollment = LessonUser::query()
            ->where('lesson_id', $lesson->id)
            ->where('user_id', $user->id)
            ->where('status', LessonUser::STATUS_PENDING)
            ->firstOrFail();

        $request->validate([
            'proof' => 'required|file|image|mimes:jpeg,jpg,png,gif,webp|max:10240',
        ]);

        $file = $request->file('proof');
        $dir = 'lesson-proofs/'.$enrollment->id;
        $oldPath = $enrollment->payment_proof_path;
        if ($oldPath && Storage::disk('local')->exists($oldPath)) {
            Storage::disk('local')->delete($oldPath);
        }

        $path = $file->store($dir, 'local');
        $enrollment->update(['payment_proof_path' => $path]);

        return back()->with('success', 'Comprobante subido. Lo revisaremos en breve.');
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

        $exists = $lesson->enrollments()->where('user_id', $user->id)->whereIn('status', [LessonUser::STATUS_PENDING, LessonUser::STATUS_CONFIRMED, LessonUser::STATUS_ENROLLED, LessonUser::STATUS_ATTENDED])->exists();
        if ($exists) {
            return back()->with('error', 'Ya estás inscrito.');
        }

        $enrolled = $lesson->enrolledCount();
        if ($enrolled >= $lesson->max_slots) {
            return back()->with('error', 'Clase completa.');
        }

        $newTotal = $lesson->totalPartySize() + 1;
        $hasBig = $lesson->hasBigGroup() || (1 >= 7);
        if ($lesson->isStaffFullFor($newTotal, $hasBig)) {
            return back()->with('error', 'Completo: no hay monitores disponibles.');
        }
        $capacity = $lesson->max_capacity ?? $lesson->max_slots;
        if ($newTotal > (int) $capacity) {
            return back()->with('error', 'Clase completa por capacidad.');
        }

        $lesson->users()->attach($user->id, [
            'party_size' => 1,
            'credits_locked' => 0,
            'status' => LessonUser::STATUS_ENROLLED,
        ]);

        return back()->with('success', 'Inscripción realizada. Los créditos se descontarán 1h antes.');
    }

    /**
     * Cancelar inscripción o solicitud (política 24h para enrolled; pending/confirmed solo se marcan cancelados).
     */
    public function cancel(Lesson $lesson)
    {
        $enrollment = $lesson->enrollments()->where('user_id', auth()->id())->first();
        if (! $enrollment) {
            return back()->with('error', 'No estás inscrito.');
        }

        if (in_array($enrollment->status, [LessonUser::STATUS_PENDING, LessonUser::STATUS_CONFIRMED], true)) {
            $enrollment->update([
                'status' => LessonUser::STATUS_CANCELLED,
                'cancelled_at' => now(),
            ]);
            return back()->with('success', 'Solicitud cancelada.');
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
