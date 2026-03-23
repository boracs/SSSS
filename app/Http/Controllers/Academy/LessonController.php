<?php

namespace App\Http\Controllers\Academy;

use App\Http\Controllers\Controller;
use App\Mail\ReservationConfirmedMail;
use App\Mail\RequestReceivedMail;
use App\Models\Lesson;
use App\Models\LessonUser;
use App\Models\StaffAssignment;
use App\Models\BonoConsumption;
use App\Models\UserBono;
use App\Services\AutoReleaseService;
use App\Services\CreditEngineService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class LessonController extends Controller
{
    public function __construct(
        protected CreditEngineService $creditEngine,
        protected AutoReleaseService $autoReleaseService
    ) {
        Cache::remember('auto_cleanup_check', 900, function () {
            return $this->autoReleaseService->cleanupExpiredReservations();
        });
    }

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

        $now = Carbon::now('UTC');
        $rangeStart = $month->copy()->startOfMonth()->startOfDay();
        $rangeEnd = $month->copy()->endOfMonth()->endOfDay();

        $canSeeVip = auth()->user() && (string) auth()->user()?->role === 'admin';

        // Dataset ligero para el calendario (alto rendimiento).
        $calendarLessons = Lesson::query()
            ->where('status', Lesson::STATUS_SCHEDULED)
            ->whereBetween('starts_at', [$rangeStart, $rangeEnd])
            ->orderBy('starts_at')
            ->get(['id', 'starts_at', 'type', 'is_private', 'level', 'modality'])
            ->filter(function (Lesson $l) use ($canSeeVip) {
                $isVip = (bool) ($l->is_private ?? false);
                return $canSeeVip ? true : ! $isVip;
            });

        $dayStats = $calendarLessons
            ->groupBy(fn (Lesson $l) => $l->starts_at->format('Y-m-d'))
            ->map(function ($items) use ($canSeeVip) {
                $itemsArr = $items->map(function (Lesson $l) {
                    $isVip = (bool) ($l->is_private ?? false);
                    $modality = $l->modality ?: ($isVip ? 'particular' : (($l->type ?? '') === 'weekly' ? 'semanal' : 'grupal'));
                    // Tipos operativos para pills: particular / grupal / semanal
                    $pillType = $modality;

                    return [
                        't' => $pillType,
                        'vip' => $isVip,
                        'time' => $l->starts_at->format('H:i'),
                        'level' => $l->level,
                    ];
                })->values();

                $countByType = [
                    'particular' => (int) $itemsArr->where('t', 'particular')->count(),
                    'grupal' => (int) $itemsArr->where('t', 'grupal')->count(),
                    'semanal' => (int) $itemsArr->where('t', 'semanal')->count(),
                ];

                return [
                    'count_by_type' => $countByType,
                    'is_vip' => $canSeeVip ? $itemsArr->contains(fn ($i) => ! empty($i['vip'])) : false,
                    'items' => $itemsArr->take(12)->toArray(), // para tooltip (cap duro)
                    'total' => (int) $itemsArr->count(),
                ];
            })
            ->toArray();

        // Feed continuo: clases futuras (>= ahora) ordenadas.
        $feedLessons = Lesson::query()
            ->where('status', Lesson::STATUS_SCHEDULED)
            ->where('starts_at', '>=', $now)
            ->withCount([
                'enrollments as pending_count' => fn ($q) => $q->whereIn('status', [
                    LessonUser::STATUS_PENDING,
                    LessonUser::STATUS_PENDING_EXTRA_MONITOR,
                ]),
                'enrollments as confirmed_count' => fn ($q) => $q->whereIn('status', [
                    LessonUser::STATUS_CONFIRMED,
                    LessonUser::STATUS_ENROLLED,
                    LessonUser::STATUS_ATTENDED,
                ]),
            ])
            ->with(['enrollments' => function ($q) {
                $q->select('id', 'lesson_id', 'status', 'quantity', 'party_size', 'age_bracket')
                    ->whereIn('status', [
                        LessonUser::STATUS_PENDING,
                        LessonUser::STATUS_PENDING_EXTRA_MONITOR,
                        LessonUser::STATUS_CONFIRMED,
                        LessonUser::STATUS_ENROLLED,
                        LessonUser::STATUS_ATTENDED,
                    ]);
            }])
            ->orderBy('starts_at')
            ->get([
                'id',
                'title',
                'description',
                'starts_at',
                'ends_at',
                'type',
                'modality',
                'batch_id',
                'level',
                'location',
                'is_private',
                'price',
                'currency',
            ])
            ->map(function (Lesson $l) {
                $pending = (int) ($l->pending_count ?? 0);
                $confirmed = (int) ($l->confirmed_count ?? 0);
                $ageBrackets = $l->enrollments?->pluck('age_bracket')->filter()->unique()->values() ?? collect();
                $partyTotal = (int) ($l->enrollments?->sum(fn ($e) => (int) ($e->quantity ?? $e->party_size ?? 1)) ?? ($pending + $confirmed));
                return [
                    'id' => $l->id,
                    'date' => $l->starts_at->format('Y-m-d'),
                    'type' => $l->type ?? Lesson::TYPE_SURF,
                    'is_private' => (bool) ($l->is_private ?? false),
                    'modality' => $l->modality ?: ((bool) ($l->is_private ?? false) ? Lesson::MODALITY_PARTICULAR : (($l->type ?? '') === 'weekly' ? Lesson::MODALITY_SEMANAL : Lesson::MODALITY_GRUPAL)),
                    'batch_id' => $l->batch_id,
                    'title' => $l->is_private ? null : $l->title,
                    'description' => $l->description,
                    'starts_at' => $l->starts_at->toIso8601String(),
                    'ends_at' => $l->ends_at->toIso8601String(),
                    'level' => $l->level,
                    'location' => $l->location ?? 'Zurriola',
                    'pending_count' => $pending,
                    'confirmed_count' => $confirmed,
                    'total_students' => $partyTotal,
                    'max_slots' => (int) ($l->max_slots ?? 0),
                    'age_mix' => [
                        'has_children' => $ageBrackets->contains('children'),
                        'has_adults' => $ageBrackets->contains('adult'),
                        'has_family' => $ageBrackets->contains('family'),
                    ],
                    'price' => $l->price !== null ? (float) $l->price : null,
                    'currency' => $l->currency ?? 'EUR',
                ];
            })
            ->values()
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
                ->where(function ($q) {
                    $q->whereIn('status', ['pending', 'confirmed', 'enrolled', 'attended'])
                      ->orWhere(function ($q2) {
                          $q2->where('status', LessonUser::STATUS_CANCELLED)
                             ->where('cancelled_at', '>=', now()->subDays(14));
                      });
                })
                ->get(['id', 'lesson_id', 'status', 'expires_at', 'payment_proof_path', 'admin_notes']);
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
            $myEnrollmentAdminNotesByLesson = $enrollments->mapWithKeys(fn ($e) => [$e->lesson_id => $e->admin_notes])->toArray();

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
            'dayStats' => $dayStats,
            'lessonsFeed' => $feedLessons,
            'canSeeVip' => $canSeeVip,
            'optimalDates' => $optimalDates,
            'creditsBalance' => 0,
            'myEnrollmentLessonIds' => $myEnrollmentLessonIds,
            'myEnrollmentStatusByLesson' => $myEnrollmentStatusByLesson,
            'myEnrollmentExpiresAtByLesson' => $myEnrollmentExpiresAtByLesson,
            'myEnrollmentHasProofByLesson' => $myEnrollmentHasProofByLesson,
            'myEnrollmentIdByLesson' => $myEnrollmentIdByLesson,
            'myEnrollmentAdminNotesByLesson' => $myEnrollmentAdminNotesByLesson ?? [],
            'pendingSurfTripLesson' => $pendingSurfTripLesson,
            'paymentBizumNumber' => config('services.academy.bizum_number', '[BIZUM_NUMBER]'),
            'paymentIban' => config('services.academy.iban', '[IBAN]'),
            'whatsappHelpUrl' => 'https://wa.me/'.preg_replace('/\D/', '', config('services.academy.whatsapp_number', '34600000000')),
        ]);
    }

    /**
     * Disponibilidad para particulares (slots de 1.5h donde haya al menos 1 monitor libre).
     * Responde JSON para UI "Solicitar Particular".
     */
    public function privateAvailability(Request $request)
    {
        $validated = $request->validate([
            'date' => 'required|date',
        ]);

        $day = Carbon::parse($validated['date'])->startOfDay();
        $today = Carbon::today();
        if ($day->lt($today)) {
            return response()->json(['date' => $day->format('Y-m-d'), 'slots' => []]);
        }

        $dayStart = $day->copy()->startOfDay();
        $dayEnd = $day->copy()->endOfDay();

        $lessons = Lesson::query()
            ->where('status', Lesson::STATUS_SCHEDULED)
            ->whereBetween('starts_at', [$dayStart, $dayEnd])
            ->with(['enrollments', 'staffAssignments'])
            ->get();

        // Generar slots (inicio cada 30 min) de 08:00 a 19:00 (90 min de duración)
        $slots = [];
        $cursor = $day->copy()->setTime(8, 0);
        $lastStart = $day->copy()->setTime(19, 0);
        while ($cursor->lte($lastStart)) {
            $slotStart = $cursor->copy();
            $slotEnd = $cursor->copy()->addMinutes(90);

            // Solo futuro (hoy: no permitir horarios pasados)
            if ($slotEnd->lessThanOrEqualTo(now())) {
                $cursor->addMinutes(30);
                continue;
            }

            $overlapping = $lessons->filter(function (Lesson $l) use ($slotStart, $slotEnd) {
                $ls = Carbon::parse($l->starts_at);
                $le = Carbon::parse($l->ends_at);
                return $ls->lt($slotEnd) && $le->gt($slotStart);
            });

            // Regla a): 2 clases distintas en ese tramo => no disponible
            if ($overlapping->count() >= 2) {
                $cursor->addMinutes(30);
                continue;
            }

            $monitorsUsed = 0;
            foreach ($overlapping as $l) {
                // Regla c): si hay 2 monitores explícitamente asignados
                $explicitMonitors = $l->staffAssignments->where('role', StaffAssignment::ROLE_MONITOR)->count();
                if ($explicitMonitors >= 2) {
                    $monitorsUsed = 2;
                    break;
                }

                $partyTotal = (int) $l->totalPartySize();
                $hasBig = $l->hasBigGroup() || $partyTotal >= 7;
                // Regla b): grupal con >=7 consume 2 monitores
                if (($l->modality ?? null) === Lesson::MODALITY_GRUPAL && $partyTotal >= 7) {
                    $monitorsUsed = 2;
                    break;
                }

                $monitorsUsed = max($monitorsUsed, $l->monitorsRequiredFor($partyTotal, $hasBig));
            }

            if ($monitorsUsed < 2) {
                $slots[] = [
                    'start' => $slotStart->format('H:i'),
                    'end' => $slotEnd->format('H:i'),
                ];
            }

            $cursor->addMinutes(30);
        }

        return response()->json([
            'date' => $day->format('Y-m-d'),
            'slots' => $slots,
        ]);
    }

    /**
     * Solicitud de clase particular: crea una lección particular + enrollment pending del alumno.
     * La petición aparece en Commander como "particular" para aprobar/assign manual.
     */
    public function requestPrivateLesson(Request $request)
    {
        $user = auth()->user();
        if (! $user) {
            return back()->with('error', 'Debes iniciar sesión.');
        }

        $validated = $request->validate([
            'date' => 'required|date',
            'start' => 'required|date_format:H:i',
        ]);

        $day = Carbon::parse($validated['date']);
        if ($day->startOfDay()->lt(Carbon::today())) {
            return back()->with('error', 'No puedes solicitar una fecha pasada.');
        }

        $startsAt = Carbon::parse($validated['date'].' '.$validated['start'], config('app.timezone'));
        $endsAt = $startsAt->copy()->addMinutes(90);

        $lesson = Lesson::create([
            'starts_at' => $startsAt,
            'ends_at' => $endsAt,
            'level' => Lesson::LEVEL_INICIACION,
            'modality' => Lesson::MODALITY_PARTICULAR,
            'max_slots' => 6,
            'location' => 'Zurriola',
            'is_private' => true,
            'status' => Lesson::STATUS_SCHEDULED,
            'title' => null,
            'description' => null,
        ]);

        $enrollment = LessonUser::create([
            'lesson_id' => $lesson->id,
            'user_id' => $user->id,
            'party_size' => 1,
            'credits_locked' => 0,
            'status' => LessonUser::STATUS_PENDING,
            'payment_status' => LessonUser::PAYMENT_PENDING,
            'expires_at' => Carbon::now('UTC')->addHours(2),
        ]);

        if ($user->email) {
            Mail::to($user->email)->send(new RequestReceivedMail(
                $enrollment,
                $lesson,
                config('services.academy.iban', '[IBAN]'),
                config('services.academy.bizum_number', '[BIZUM_NUMBER]'),
                url()->route('profile.edit')
            ));
        }

        return back()
            ->with('success', 'Solicitud de clase particular creada. Te avisaremos cuando el staff la confirme.')
            ->with('payment_lesson_id', $lesson->id)
            ->with('payment_lesson_payload', [
                'id' => $lesson->id,
                'starts_at' => $lesson->starts_at->toIso8601String(),
                'ends_at' => $lesson->ends_at->toIso8601String(),
                'level' => $lesson->level,
                'modality' => $lesson->modality,
                'location' => $lesson->location ?? 'Zurriola',
                'price' => $lesson->price !== null ? (float) $lesson->price : null,
                'currency' => $lesson->currency ?? 'EUR',
                'is_private' => true,
                'title' => null,
                'description' => null,
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
            'quantity' => 'nullable|integer|min:1|max:6',
            'party_size' => 'nullable|integer|min:1|max:12', // compat legacy
            'request_extra_monitor' => 'nullable|boolean',
            'age_bracket' => 'nullable|in:children,adult,family',
        ]);
        $partySize = (int) ($validated['quantity'] ?? $validated['party_size'] ?? 1);
        $requestExtraMonitor = (bool) ($validated['request_extra_monitor'] ?? false);
        $ageBracket = $validated['age_bracket'] ?? null;

        if ($lesson->starts_at && Carbon::parse($lesson->starts_at)->lt(now())) {
            return back()->with('error', 'No puedes solicitar una clase pasada.');
        }

        $enrollment = null;
        try {
            $enrollment = DB::transaction(function () use ($lesson, $user, $partySize) {
                // Lock lesson row to serialize capacity checks
                $lockedLesson = Lesson::query()->whereKey($lesson->id)->lockForUpdate()->firstOrFail();

                $activeStatuses = [
                    LessonUser::STATUS_PENDING,
                    LessonUser::STATUS_PENDING_EXTRA_MONITOR,
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
                    ->sum(DB::raw('COALESCE(quantity, party_size, 1)'));

                $currentHasBig = LessonUser::query()
                    ->where('lesson_id', $lockedLesson->id)
                    ->whereIn('status', $activeStatuses)
                    ->whereRaw('COALESCE(quantity, party_size, 1) >= 7')
                    ->lockForUpdate()
                    ->exists();

                $existingAgeBrackets = LessonUser::query()
                    ->where('lesson_id', $lockedLesson->id)
                    ->whereIn('status', $activeStatuses)
                    ->whereNotNull('age_bracket')
                    ->lockForUpdate()
                    ->pluck('age_bracket')
                    ->unique()
                    ->values()
                    ->toArray();

                if (! empty($existingAgeBrackets) && $ageBracket && ! in_array('family', $existingAgeBrackets, true) && $ageBracket !== 'family') {
                    $hasAdults = in_array('adult', $existingAgeBrackets, true) || $ageBracket === 'adult';
                    $hasChildren = in_array('children', $existingAgeBrackets, true) || $ageBracket === 'children';
                    if ($hasAdults && $hasChildren) {
                        throw new \RuntimeException('MEZCLA_EDAD_NO_PERMITIDA');
                    }
                }

                $newTotal = $currentTotal + $partySize;
                $hasBig = $currentHasBig || $partySize >= 7;
                $modality = $lockedLesson->modality ?: ((bool) ($lockedLesson->is_private ?? false) ? Lesson::MODALITY_PARTICULAR : Lesson::MODALITY_GRUPAL);
                $isParticular = $modality === Lesson::MODALITY_PARTICULAR;
                if (! $isParticular) {
                    $monitors = $lockedLesson->monitorsRequiredFor($newTotal, $hasBig);
                    if ($monitors >= 2) {
                        throw new \RuntimeException('COMPLETO_STAFF');
                    }
                }

                $capacity = $isParticular ? 6 : ($lockedLesson->max_capacity ?? $lockedLesson->max_slots ?? 6);
                if ($capacity && $newTotal > (int) $capacity && ! $requestExtraMonitor) {
                    throw new \RuntimeException('OFRECER_REFUERZO');
                }
                if ($capacity && $newTotal > 12) {
                    throw new \RuntimeException('COMPLETO_CAPACIDAD');
                }

                if ($existing) {
                    $existing->fill([
                        'party_size' => $partySize,
                        'quantity' => $partySize,
                        'age_bracket' => $ageBracket,
                        'credits_locked' => 0,
                        'status' => $requestExtraMonitor ? LessonUser::STATUS_PENDING_EXTRA_MONITOR : LessonUser::STATUS_PENDING,
                        'payment_status' => LessonUser::PAYMENT_PENDING,
                        'expires_at' => Carbon::now('UTC')->addHours(2),
                    ])->save();
                    return $existing;
                }

                return LessonUser::create([
                    'lesson_id' => $lockedLesson->id,
                    'user_id' => $user->id,
                    'party_size' => $partySize,
                    'quantity' => $partySize,
                    'age_bracket' => $ageBracket,
                    'credits_locked' => 0,
                    'status' => $requestExtraMonitor ? LessonUser::STATUS_PENDING_EXTRA_MONITOR : LessonUser::STATUS_PENDING,
                    'payment_status' => LessonUser::PAYMENT_PENDING,
                    'expires_at' => Carbon::now('UTC')->addHours(2),
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
            if ($e->getMessage() === 'OFRECER_REFUERZO') {
                $activeStatuses = [
                    LessonUser::STATUS_PENDING,
                    LessonUser::STATUS_PENDING_EXTRA_MONITOR,
                    LessonUser::STATUS_CONFIRMED,
                    LessonUser::STATUS_ENROLLED,
                    LessonUser::STATUS_ATTENDED,
                ];
                $currentTotal = (int) LessonUser::query()
                    ->where('lesson_id', $lesson->id)
                    ->whereIn('status', $activeStatuses)
                    ->sum(DB::raw('COALESCE(quantity, party_size, 1)'));
                $capacity = (int) ($lesson->max_capacity ?? $lesson->max_slots ?? 6);
                $available = max(0, $capacity - $currentTotal);
                return back()
                    ->with('error', "Solo quedan {$available} plazas aseguradas. Al ser un grupo mayor, excederemos el cupo de 6 alumnos y necesitaremos asignar un segundo monitor para garantizar la calidad y seguridad. ¿Desea que comprobemos si es posible solicitar otro monitor para su grupo?")
                    ->with('extra_monitor_offer', [
                        'lesson_id' => $lesson->id,
                        'available' => $available,
                        'requested' => $partySize,
                    ]);
            }
            if ($e->getMessage() === 'MEZCLA_EDAD_NO_PERMITIDA') {
                return back()->with('error', 'Por seguridad y autonomía, no mezclamos rangos de edad distantes en el mismo grupo de agua.');
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
            ->with('success', '¡Solicitud recibida! Tienes 2 horas para abonar el compromiso de 20€ o el total de la clase para asegurar tu plaza. De lo contrario, la solicitud podría ser ignorada.')
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

        if ($lesson->starts_at && Carbon::parse($lesson->starts_at)->lt(now())) {
            return back()->with('error', 'No puedes subir un comprobante para una clase pasada.');
        }

        $request->validate([
            'proof' => 'required|file|mimes:jpeg,jpg,png,gif,webp,pdf|max:10240',
            'payment_method' => 'nullable|in:bizum,transferencia',
        ]);

        $file = $request->file('proof');
        $dir = 'lesson-proofs/'.$enrollment->id;
        $oldPath = $enrollment->payment_proof_path;
        if ($oldPath && Storage::disk('local')->exists($oldPath)) {
            Storage::disk('local')->delete($oldPath);
        }

        $path = $file->store($dir, 'local');
        $enrollment->update([
            'payment_proof_path' => $path,
            'proof_uploaded_at' => now(),
            'payment_method' => $request->input('payment_method'),
            'payment_status' => LessonUser::PAYMENT_SUBMITTED,
        ]);

        return back()->with('success', 'Justificante subido. Lo revisaremos en breve.');
    }

    /**
     * Confirmación manual de pago en tienda (solo Admin): efectivo/TPV.
     */
    public function confirmManualPayment(Request $request, Lesson $lesson)
    {
        $actor = auth()->user();
        if (! $actor) {
            return back()->with('error', 'Debes iniciar sesión.');
        }

        $isAdmin = (string) ($actor->role ?? '') === 'admin' || (bool) ($actor->is_admin ?? false);
        if (! $isAdmin) {
            abort(403, 'Solo Admin puede confirmar pagos manuales.');
        }

        $validated = $request->validate([
            'user_id' => 'required|integer|exists:users,id',
        ]);

        $enrollment = LessonUser::query()
            ->where('lesson_id', $lesson->id)
            ->where('user_id', (int) $validated['user_id'])
            ->first();

        if (! $enrollment) {
            return back()->with('error', 'No existe solicitud de ese alumno para esta clase.');
        }

        $note = 'Pago manual realizado por Admin en tienda';
        $previous = trim((string) ($enrollment->admin_notes ?? ''));
        $mergedNotes = $previous !== '' ? ($previous.' | '.$note) : $note;

        $enrollment->update([
            'status' => LessonUser::STATUS_CONFIRMED,
            'payment_status' => LessonUser::PAYMENT_CONFIRMED,
            'confirmed_at' => now(),
            'expires_at' => null,
            // Prioridad contable a tienda: evitar doble contabilización con comprobante digital.
            'payment_method' => 'tienda',
            'payment_proof_path' => null,
            'proof_uploaded_at' => null,
            'admin_notes' => $mergedNotes,
        ]);

        $enrollment->load('user', 'lesson');
        $googleMapsUrl = config('services.academy.maps_url');
        if ($enrollment->user && $enrollment->user->email) {
            try {
                Mail::to($enrollment->user->email)->queue(new ReservationConfirmedMail($enrollment->user, $enrollment->lesson, $googleMapsUrl));
            } catch (\Throwable $e) {
                Log::error('Error enviando ReservationConfirmedMail en confirmación manual', [
                    'enrollment_id' => $enrollment->id,
                    'lesson_id' => $enrollment->lesson_id,
                    'user_id' => $enrollment->user_id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return back()->with('success', 'Pago manual confirmado en tienda.');
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

        if ($lesson->starts_at && Carbon::parse($lesson->starts_at)->lt(now())) {
            return back()->with('error', 'No puedes inscribirte en una clase pasada.');
        }

        $consumedBonoId = null;
        if ((bool) ($user->is_vip ?? false)) {
            $vipBono = UserBono::query()
                ->where('user_id', $user->id)
                ->where('status', UserBono::STATUS_CONFIRMED)
                ->where('clases_restantes', '>', 0)
                ->orderBy('id')
                ->first();

            if (! $vipBono) {
                return back()->with('error', 'Eres usuario VIP, pero no tienes bonos confirmados con clases disponibles.');
            }
            $consumedBonoId = $vipBono->id;
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

        try {
            DB::transaction(function () use ($lesson, $user, $consumedBonoId) {
                if ($consumedBonoId) {
                    $vipBono = UserBono::query()->whereKey($consumedBonoId)->lockForUpdate()->first();
                    if (! $vipBono || $vipBono->status !== UserBono::STATUS_CONFIRMED || (int) $vipBono->clases_restantes <= 0) {
                        throw new \RuntimeException('BONO_NO_DISPONIBLE');
                    }
                    $vipBono->decrement('clases_restantes', 1);
                    $vipBono->refresh();

                    BonoConsumption::create([
                        'user_bono_id' => $vipBono->id,
                        'user_id' => $user->id,
                        'lesson_id' => $lesson->id,
                        'remaining_after' => (int) $vipBono->clases_restantes,
                        'consumed_at' => now(),
                    ]);
                }

                $lesson->users()->attach($user->id, [
                    'party_size' => 1,
                    'credits_locked' => 0,
                    'status' => LessonUser::STATUS_ENROLLED,
                ]);
            });
        } catch (\RuntimeException $e) {
            if ($e->getMessage() === 'BONO_NO_DISPONIBLE') {
                return back()->with('error', 'Tu bono VIP ya no tiene clases disponibles. Actualiza y vuelve a intentarlo.');
            }
            throw $e;
        }

        return back()->with('success', 'Inscripción realizada correctamente.');
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
