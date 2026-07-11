<?php

namespace App\Http\Controllers\Academy;

use App\Actions\Academy\EnrollStudentAction;
use App\Actions\Academy\RequestLessonAction;
use App\Actions\Academy\RequestPrivateLessonAction;
use App\Actions\Academy\UploadLessonProofAction;
use App\Actions\Academy\CancelEnrollmentAction;
use App\Actions\Payments\InitiatePaymentAction;
use App\DTOs\Payments\InitiatePaymentDto;
use App\DTOs\Payments\PaymentLineItemDto;
use App\Enums\PaymentStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Academy\EnrollStudentRequest;
use App\Http\Requests\Academy\RequestLessonRequest;
use App\Http\Requests\Academy\RequestPrivateLessonRequest;
use App\Http\Requests\Academy\UploadLessonProofRequest;
use App\Mail\ReservationConfirmedMail;
use App\Models\Lesson;
use App\Models\LessonUser;
use App\Models\UserBono;
use App\Services\AutoReleaseService;
use App\Services\AvailabilityService;
use App\Services\CreditEngineService;
use App\Support\AcademyContact;
use App\Support\AcademyEnrollmentPolicy;
use App\Support\BusinessDateTime;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;

class LessonController extends Controller
{
    public function __construct(
        protected CreditEngineService $creditEngine,
        protected AutoReleaseService $autoReleaseService,
        protected AvailabilityService $availabilityService,
        protected EnrollStudentAction $enrollStudentAction,
        protected RequestLessonAction $requestLessonAction,
        protected RequestPrivateLessonAction $requestPrivateLessonAction,
        protected UploadLessonProofAction $uploadLessonProofAction,
        protected CancelEnrollmentAction $cancelEnrollmentAction,
        protected InitiatePaymentAction $initiatePaymentAction,
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
            ? BusinessDateTime::parseInAppTimezone((string) $request->input('date'))->startOfDay()
            : BusinessDateTime::today();

        $month = $request->has('month')
            ? BusinessDateTime::parseInAppTimezone((string) $request->input('month'))->startOfMonth()
            : $date->copy()->startOfMonth();

        $now = BusinessDateTime::now();
        $rangeStart = $month->copy()->startOfMonth()->startOfDay();
        $rangeEnd = $month->copy()->endOfMonth()->endOfDay();

        $viewer = auth()->user();
        $isAdminViewer = (bool) $viewer && (
            (string) ($viewer->role ?? '') === 'admin'
            || (bool) ($viewer->is_admin ?? false)
        );
        $isVipViewer = (bool) $viewer && (bool) ($viewer->is_vip ?? false);
        $canSeeVip = $isAdminViewer || $isVipViewer;

        $canViewLessonByRole = function (Lesson $lesson) use ($isAdminViewer, $isVipViewer): bool {
            if ($isAdminViewer) {
                return true;
            }

            $modality = (string) ($lesson->modality ?: ((bool) ($lesson->is_private ?? false)
                ? Lesson::MODALITY_PARTICULAR
                : (($lesson->type ?? '') === 'weekly' ? Lesson::MODALITY_SEMANAL : Lesson::MODALITY_GRUPAL)));

            if ($isVipViewer) {
                return in_array($modality, [
                    Lesson::MODALITY_GRUPAL,
                    Lesson::MODALITY_SEMANAL,
                    'vip',
                ], true);
            }

            return in_array($modality, [
                Lesson::MODALITY_GRUPAL,
                Lesson::MODALITY_SEMANAL,
            ], true);
        };

        // Dataset ligero para el calendario (alto rendimiento).
        $calendarLessons = Lesson::query()
            ->where('status', Lesson::STATUS_SCHEDULED)
            ->whereBetween('starts_at', [$rangeStart, $rangeEnd])
            ->orderBy('starts_at')
            ->get(['id', 'starts_at', 'type', 'is_private', 'level', 'modality'])
            ->filter($canViewLessonByRole);

        $dayStats = $calendarLessons
            ->groupBy(fn (Lesson $l) => $l->starts_at->format('Y-m-d'))
            ->map(function ($items) use ($canSeeVip) {
                $itemsArr = $items->map(function (Lesson $l) {
                    $isVip = (string) ($l->modality ?? '') === 'vip';
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
            ->filter($canViewLessonByRole)
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
                    'starts_at' => BusinessDateTime::toApi($l->starts_at),
                    'ends_at' => BusinessDateTime::toApi($l->ends_at),
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
            ->map(fn ($d) => BusinessDateTime::parseInAppTimezone((string) $d)->format('Y-m-d'))
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
                    $q->whereIn('status', [
                        'pending',
                        LessonUser::STATUS_PENDING_EXTRA_MONITOR,
                        'confirmed',
                        'enrolled',
                        'attended',
                    ])
                        ->orWhere(function ($q2) {
                            $q2->where('status', LessonUser::STATUS_CANCELLED)
                                ->where('cancelled_at', '>=', BusinessDateTime::now()->subDays(14));
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
                    'starts_at' => BusinessDateTime::toApi($pending->lesson->starts_at),
                ];
            }
        }

        $creditsBalance = 0;
        if ($viewer && (bool) ($viewer->is_vip ?? false)) {
            $creditsBalance = (int) UserBono::query()
                ->where('user_id', $viewer->id)
                ->where('status', UserBono::STATUS_CONFIRMED)
                ->sum('clases_restantes');
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
            'creditsBalance' => $creditsBalance,
            'enrollmentPolicy' => [
                'enroll_cutoff_minutes' => AcademyEnrollmentPolicy::enrollCutoffMinutes(),
                'cancel_cutoff_hours' => AcademyEnrollmentPolicy::cancelCutoffHours(),
                'standard_monitor_capacity' => AcademyEnrollmentPolicy::standardMonitorCapacity(),
            ],
            'myEnrollmentLessonIds' => $myEnrollmentLessonIds,
            'myEnrollmentStatusByLesson' => $myEnrollmentStatusByLesson,
            'myEnrollmentExpiresAtByLesson' => $myEnrollmentExpiresAtByLesson,
            'myEnrollmentHasProofByLesson' => $myEnrollmentHasProofByLesson,
            'myEnrollmentIdByLesson' => $myEnrollmentIdByLesson,
            'myEnrollmentAdminNotesByLesson' => $myEnrollmentAdminNotesByLesson ?? [],
            'pendingSurfTripLesson' => $pendingSurfTripLesson,
            'paymentBizumNumber' => config('services.academy.bizum_number', '[BIZUM_NUMBER]'),
            'paymentIban' => config('services.academy.iban', '[IBAN]'),
            'whatsappHelpUrl' => AcademyContact::whatsappBaseUrl(),
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
            'duration_minutes' => 'nullable|integer|min:30|max:300',
        ]);

        $day = BusinessDateTime::parseInAppTimezone((string) $validated['date'])->startOfDay();
        $today = BusinessDateTime::today();
        if ($day->lt($today)) {
            return response()->json(['date' => $day->format('Y-m-d'), 'slots' => []]);
        }

        $durationMinutes = (int) ($validated['duration_minutes'] ?? 90);
        if ($durationMinutes < 60 || $durationMinutes % 15 !== 0) {
            return response()->json([
                'date' => $day->format('Y-m-d'),
                'slots' => [],
                'message' => 'La duración debe ser de al menos 1 hora y en múltiplos de 15.',
            ], 422);
        }

        // Generar slots (inicio cada 15 min) de 08:00 hasta que la sesión termine como máximo a las 22:00.
        $slots = [];
        $cursor = $day->copy()->setTime(8, 0);
        $dayEnd = $day->copy()->setTime(22, 0);
        $lastStart = $dayEnd->copy()->subMinutes($durationMinutes);
        if ($lastStart->lt($cursor)) {
            return response()->json([
                'date' => $day->format('Y-m-d'),
                'duration_minutes' => $durationMinutes,
                'slots' => [],
            ]);
        }

        while ($cursor->lte($lastStart)) {
            $slotStart = $cursor->copy();
            $slotEnd = $cursor->copy()->addMinutes($durationMinutes);

            // Solo futuro (hoy: no permitir horarios pasados)
            if ($slotEnd->lessThanOrEqualTo(BusinessDateTime::now())) {
                $cursor->addMinutes(15);

                continue;
            }

            $availability = $this->availabilityService->preview($slotStart, $slotEnd, 1);
            if ($availability['allowed']) {
                $slots[] = [
                    'start' => $slotStart->format('H:i'),
                    'end' => $slotEnd->format('H:i'),
                ];
            }

            $cursor->addMinutes(15);
        }

        return response()->json([
            'date' => $day->format('Y-m-d'),
            'duration_minutes' => $durationMinutes,
            'slots' => $slots,
        ]);
    }

    /**
     * Solicitud de clase particular: crea una lección particular + enrollment pending del alumno.
     * La petición aparece en Commander como "particular" para aprobar/assign manual.
     */
    public function requestPrivateLesson(RequestPrivateLessonRequest $request)
    {
        $user = $request->user();
        if (! $user) {
            return back()->with('error', 'Debes iniciar sesión.');
        }

        $result = $this->requestPrivateLessonAction->execute($user, $request);

        if (! $result['ok']) {
            return back()->with('error', $result['message']);
        }

        /** @var \App\Models\LessonUser $enrollment */
        $enrollment = $result['enrollment'];
        /** @var \App\Models\Lesson $lesson */
        $lesson = $result['lesson'];

        $depositEur   = (float) config('services.academy.class_reservation_deposit_eur', 30);
        $priceCents   = (int) round($depositEur * 100);
        $dateLabel    = $lesson->starts_at?->locale('es')->translatedFormat('d/m/Y H:i') ?? '';

        $dto = new InitiatePaymentDto(
            payableType:   LessonUser::class,
            payableId:     $enrollment->id,
            lineItems:     [
                new PaymentLineItemDto(
                    name:            'Clase particular',
                    description:     $dateLabel,
                    unitAmountCents: $priceCents,
                    quantity:        1,
                ),
            ],
            successPath:   '/pago/exito',
            cancelPath:    '/academia',
            customerEmail: $user->email,
            metadata:      [
                'lesson_id'     => (string) $lesson->id,
                'enrollment_id' => (string) $enrollment->id,
                'modality'      => 'particular',
            ],
        );

        try {
            $checkoutUrl = $this->initiatePaymentAction->execute($dto);

            return $this->redirectToStripeCheckout($checkoutUrl);
        } catch (\RuntimeException $e) {
            Log::error('LessonController::requestPrivateLesson Stripe error', [
                'enrollment_id' => $enrollment->id,
                'error'         => $e->getMessage(),
            ]);

            return back()->with(
                'success',
                'Solicitud registrada. Hubo un problema al abrir el pago automático — contacta con nosotros.'
            );
        }
    }

    /**
     * Solicitar una clase → crea inscripción pending → redirige a Stripe Checkout.
     */
    public function requestLesson(RequestLessonRequest $request, Lesson $lesson)
    {
        $user = $request->user();
        if (! $user) {
            return back()->with('error', 'Debes iniciar sesión.');
        }

        $result = $this->requestLessonAction->execute(
            $user,
            $lesson,
            $request->partySize(),
            $request->requestExtraMonitor(),
            $request->ageBracket(),
            $request->participants(),
        );

        if (! $result['ok']) {
            $response = back()->with('error', $result['message']);
            if (isset($result['extra_monitor_offer'])) {
                $response = $response->with('extra_monitor_offer', $result['extra_monitor_offer']);
            }

            return $response;
        }

        /** @var \App\Models\LessonUser $enrollment */
        $enrollment = $result['enrollment'];

        // Calcular importe: precio de la clase o señal de reserva por defecto
        $priceEur     = $lesson->price !== null
            ? (float) $lesson->price
            : (float) config('services.academy.class_reservation_deposit_eur', 30);
        $priceCents   = (int) round($priceEur * 100 * $request->partySize());
        $partyLabel   = $request->partySize() > 1 ? " × {$request->partySize()} personas" : '';
        $lessonTitle  = $lesson->title ?: 'Clase de surf';
        $dateLabel    = $lesson->starts_at?->locale('es')->translatedFormat('d/m/Y H:i') ?? '';

        $dto = new InitiatePaymentDto(
            payableType:   \App\Models\LessonUser::class,
            payableId:     $enrollment->id,
            lineItems:     [
                new PaymentLineItemDto(
                    name:            "{$lessonTitle}{$partyLabel}",
                    description:     $dateLabel,
                    unitAmountCents: $priceCents,
                    quantity:        1,
                ),
            ],
            successPath:   '/pago/exito',
            cancelPath:    '/academia',
            customerEmail: $user->email,
            metadata:      [
                'lesson_id'     => (string) $lesson->id,
                'enrollment_id' => (string) $enrollment->id,
            ],
        );

        try {
            $checkoutUrl = $this->initiatePaymentAction->execute($dto);

            return $this->redirectToStripeCheckout($checkoutUrl);
        } catch (\RuntimeException $e) {
            Log::error('LessonController::requestLesson Stripe error', [
                'enrollment_id' => $enrollment->id,
                'error'         => $e->getMessage(),
            ]);

            return back()->with(
                'success',
                'Solicitud registrada. Hubo un problema al abrir el pago automático — contacta con nosotros.'
            );
        }
    }

    /**
     * Pagar inscripción pendiente existente → Stripe Checkout.
     */
    public function payPendingEnrollment(Request $request, Lesson $lesson)
    {
        $user = $request->user();
        if (! $user) {
            return back()->with('error', 'Debes iniciar sesión.');
        }

        $enrollment = LessonUser::query()
            ->where('lesson_id', $lesson->id)
            ->where('user_id', $user->id)
            ->whereIn('status', [
                LessonUser::STATUS_PENDING,
                LessonUser::STATUS_PENDING_EXTRA_MONITOR,
            ])
            ->where('payment_status', PaymentStatus::Pending->value)
            ->first();

        if (! $enrollment) {
            return back()->with('error', 'No hay una inscripción pendiente de pago para esta clase.');
        }

        $partySize  = max(1, (int) ($enrollment->party_size ?? $enrollment->quantity ?? 1));
        $priceEur   = $lesson->price !== null
            ? (float) $lesson->price
            : (float) config('services.academy.class_reservation_deposit_eur', 30);
        $priceCents = (int) round($priceEur * 100 * $partySize);
        $partyLabel = $partySize > 1 ? " × {$partySize} personas" : '';
        $lessonTitle = $lesson->title ?: 'Clase de surf';
        $dateLabel   = $lesson->starts_at?->locale('es')->translatedFormat('d/m/Y H:i') ?? '';

        $dto = new InitiatePaymentDto(
            payableType:   LessonUser::class,
            payableId:     $enrollment->id,
            lineItems:     [
                new PaymentLineItemDto(
                    name:            "{$lessonTitle}{$partyLabel}",
                    description:     $dateLabel,
                    unitAmountCents: $priceCents,
                    quantity:        1,
                ),
            ],
            successPath:   '/pago/exito',
            cancelPath:    '/academia',
            customerEmail: $user->email,
            metadata:      [
                'lesson_id'     => (string) $lesson->id,
                'enrollment_id' => (string) $enrollment->id,
            ],
        );

        try {
            return $this->redirectToStripeCheckout($this->initiatePaymentAction->execute($dto));
        } catch (\RuntimeException $e) {
            Log::error('LessonController::payPendingEnrollment Stripe error', [
                'enrollment_id' => $enrollment->id,
                'error'         => $e->getMessage(),
            ]);

            return back()->with('error', 'No se pudo abrir la pasarela de pago.');
        }
    }

    /**
     * @deprecated Flujo manual sustituido por Stripe. Mantener temporalmente por compatibilidad.
     */
    public function uploadProof(UploadLessonProofRequest $request, Lesson $lesson)
    {
        $user = $request->user();
        if (! $user) {
            return back()->with('error', 'Debes iniciar sesión.');
        }

        $enrollment = LessonUser::query()
            ->where('lesson_id', $lesson->id)
            ->where('user_id', $user->id)
            ->whereIn('status', [
                LessonUser::STATUS_PENDING,
                LessonUser::STATUS_PENDING_EXTRA_MONITOR,
            ])
            ->first();

        if (! $enrollment) {
            return back()->with('error', 'No existe una solicitud pendiente para esta clase.');
        }

        $this->authorize('uploadProof', $enrollment);

        $result = $this->uploadLessonProofAction->execute(
            $enrollment,
            $request->proofFile(),
            $request->paymentMethod(),
        );

        if (! $result['ok']) {
            return back()->with('error', $result['message']);
        }

        return back()->with('success', $result['message']);
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
            'confirmed_at' => BusinessDateTime::now(),
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
    public function enroll(EnrollStudentRequest $request, Lesson $lesson)
    {
        $this->authorize('enroll', $lesson);

        $result = $this->enrollStudentAction->execute($request->user(), $lesson);

        if (! $result['ok']) {
            return back()->with('error', $result['message']);
        }

        return back()->with('success', $result['message']);
    }

    /**
     * Cancelar inscripción o solicitud (política 24h para enrolled; pending/confirmed solo se marcan cancelados).
     */
    public function cancel(Lesson $lesson)
    {
        $user = auth()->user();
        if (! $user) {
            return back()->with('error', 'Debes iniciar sesión.');
        }

        $enrollment = LessonUser::query()
            ->where('lesson_id', $lesson->id)
            ->where('user_id', $user->id)
            ->first();

        if (! $enrollment) {
            return back()->with('error', 'No estás inscrito.');
        }

        $this->authorize('cancel', $enrollment);

        $result = $this->cancelEnrollmentAction->execute($enrollment);
        if (! $result['ok']) {
            return back()->with('error', $result['message']);
        }

        return back()->with('success', $result['message']);
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
