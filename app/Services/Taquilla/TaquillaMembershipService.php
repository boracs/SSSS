<?php

declare(strict_types=1);

namespace App\Services\Taquilla;

use App\DTOs\Taquilla\PlanTaquillaPublicDto;
use App\Events\Taquilla\PagoTaquillaConfirmado;
use App\Events\Taquilla\PagoTaquillaRechazado;
use App\Http\Requests\Taquilla\ConfirmarPagoTaquillaRequest;
use App\Http\Requests\Taquilla\ReassignLockerRequest;
use App\Http\Requests\Taquilla\RechazarPagoTaquillaRequest;
use App\Http\Requests\Taquilla\RegistrarPagoTaquillaRequest;
use App\Http\Requests\Taquilla\StorePlanTaquillaRequest;
use App\Http\Requests\Taquilla\SubirJustificanteTaquillaRequest;
use App\Http\Requests\Taquilla\UpdatePagoTaquillaCheckedStateRequest;
use App\Http\Requests\Taquilla\UpdatePagoTaquillaPaymentStateRequest;
use App\Http\Requests\Taquilla\UpdatePlanTaquillaRequest;
use App\Http\Resources\PagoCuotaQueueResource;
use App\Models\PagoCuota;
use App\Models\PlanTaquilla;
use App\Models\User;
use App\Services\Chatbot\S4BusinessContextService;
use App\Services\Payments\PaymentReceiptAccessService;
use App\Support\MoneyCents;
use Carbon\Carbon;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

class TaquillaMembershipService
{
    public function __construct(
        private readonly LockerPaymentIndexBuilder $lockerPaymentIndex,
        private readonly S4BusinessContextService $chatbotBusinessContext,
        private readonly PaymentReceiptAccessService $paymentReceipts,
    ) {}

    /**
     * @return array{planes: Collection<int, PlanTaquilla>, usuarios: Collection<int, array<string, mixed>>}
     */
    public function buildAdminDashboard(): array
    {
        $planes = PlanTaquilla::query()
            ->orderByDesc('activo')
            ->orderBy('precio_total_cents')
            ->get();

        $today = now()->startOfDay();
        $usuarios = User::with([
            'planVigente',
            'pagosCuotas' => function ($q): void {
                $q->where('status', PagoCuota::STATUS_CONFIRMED)
                    ->select('id', 'user_id', 'id_plan_pagado', 'periodo_inicio', 'periodo_fin', 'status')
                    ->orderBy('periodo_inicio');
            },
        ])->get()->map(function (User $u) use ($today): array {
            $confirmedRows = $u->pagosCuotas;
            $activeRow = $confirmedRows->first(function ($p) use ($today): bool {
                return $p->periodo_inicio && $p->periodo_fin
                    && Carbon::parse($p->periodo_inicio)->startOfDay()->lte($today)
                    && Carbon::parse($p->periodo_fin)->startOfDay()->gte($today);
            });

            $diasRestantes = null;
            $estado = 'sin plan';
            $ultimoPagoStr = null;
            $fechaFinStr = null;
            $prepaidExtraDays = 0;

            if ($activeRow && $activeRow->periodo_fin) {
                $fechaFin = Carbon::parse($activeRow->periodo_fin);
                $diasRestantes = $today->diffInDays($fechaFin, false);
                $estado = 'activo';
                $ultimoPagoStr = optional($activeRow->periodo_inicio)->toDateString();
                $fechaFinStr = optional($activeRow->periodo_fin)->toDateString();
                $prepaidExtraDays = (int) $confirmedRows
                    ->filter(fn ($p) => $p->periodo_inicio && Carbon::parse($p->periodo_inicio)->startOfDay()->gt($fechaFin->startOfDay()))
                    ->sum(function ($p): int {
                        if (! $p->periodo_inicio || ! $p->periodo_fin) {
                            return 0;
                        }
                        $start = Carbon::parse($p->periodo_inicio)->startOfDay();
                        $end = Carbon::parse($p->periodo_fin)->startOfDay();

                        return (int) ($start->diffInDays($end) + 1);
                    });
            } elseif ($u->hasPhysicalLocker()) {
                $estado = 'vencido';
            }

            return [
                'id' => $u->id,
                'nombre' => $u->nombre,
                'apellido' => $u->apellido,
                'email' => $u->email,
                'telefono' => $u->telefono,
                'numeroTaquilla' => $u->numeroTaquilla,
                'plan_vigente' => $u->planVigente
                    ? [
                        'id' => $u->planVigente->id,
                        'nombre' => $u->planVigente->nombre,
                        'duracion_dias' => $u->planVigente->duracion_dias,
                        'activo' => (bool) $u->planVigente->activo,
                    ]
                    : null,
                'ultimo_pago' => $ultimoPagoStr,
                'fecha_fin' => $fechaFinStr,
                'dias_restantes' => $diasRestantes,
                'estado' => $estado,
                'prepaid_extra_days' => $prepaidExtraDays,
                'payment_status' => $activeRow?->status ?? PagoCuota::STATUS_PENDING,
            ];
        });

        return ['planes' => $planes, 'usuarios' => $usuarios];
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function buildPublicPlans(): array
    {
        return PlanTaquilla::query()
            ->where('activo', true)
            ->orderBy('duracion_dias')
            ->get()
            ->map(fn (PlanTaquilla $plan) => PlanTaquillaPublicDto::fromModel($plan)->toArray())
            ->values()
            ->all();
    }

    /**
     * @return array{userData: array<string, mixed>, planes: list<array<string, mixed>>}
     */
    public function buildClientIndex(User $user): array
    {
        $user->load(['planVigente', 'pagosCuotas.plan']);

        $diasRestantes = null;
        if ($user->fecha_vencimiento_cuota) {
            $diasRestantes = Carbon::parse($user->fecha_vencimiento_cuota)
                ->diffInDays(Carbon::now(), false);
        }

        $planes = $this->buildPublicPlans();
        $ultimoPago = $user->pagosCuotas->sortByDesc('periodo_fin')->first();

        $historialPagos = $user->pagosCuotas;
        $receiptMap = $this->paymentReceipts->proofMetaMapForPayables(
            $historialPagos
                ->map(fn (PagoCuota $pago) => ['type' => PagoCuota::class, 'id' => (int) $pago->id])
                ->all(),
        );

        $historialPagos = $historialPagos->map(function (PagoCuota $pago) use ($receiptMap): array {
            $manualProofUrl = ! empty($pago->payment_proof_path)
                ? route('taquillas.pago.proof', $pago->id)
                : null;
            $proof = $this->paymentReceipts->proofFieldsForPayable(
                PagoCuota::class,
                (int) $pago->id,
                ! empty($pago->payment_proof_path),
                $manualProofUrl,
                $receiptMap,
            );

            return [
                'id' => $pago->id,
                'status' => $pago->status ?? PagoCuota::STATUS_PENDING,
                'monto_pagado' => $pago->monto_pagado,
                'referencia_pago_externa' => $pago->referencia_pago_externa,
                'payment_method' => $pago->payment_method,
                'is_checked' => (bool) ($pago->is_checked ?? false),
                'periodo_inicio' => optional($pago->periodo_inicio)->toDateString(),
                'periodo_fin' => optional($pago->periodo_fin)->toDateString(),
                'proof_url' => $proof['proof_url'],
                'proof_is_stripe_receipt' => $proof['proof_is_stripe_receipt'],
                'plan' => [
                    'id' => $pago->plan->id ?? null,
                    'nombre' => $pago->plan->nombre ?? null,
                ],
            ];
        });

        return [
            'userData' => [
                'id' => $user->id,
                'nombre_completo' => "{$user->nombre} {$user->apellido}",
                'numero_taquilla' => $user->hasPhysicalLocker() ? $user->numeroTaquilla : null,
                'is_vip_only' => $user->hasSharedLocker(),
                'vencimiento_cuota' => $user->fecha_vencimiento_cuota,
                'dias_restantes' => $diasRestantes,
                'plan_vigente' => $user->planVigente ? [
                    'nombre' => $user->planVigente->nombre,
                    'precio' => $user->planVigente->precio_total,
                    'descripcion' => $user->planVigente->descripcion ?? null,
                ] : null,
                'ultimo_plan_fin' => optional($ultimoPago)->periodo_fin,
                'historial_pagos' => $historialPagos,
            ],
            'planes' => $planes,
        ];
    }

    /**
     * Crea un PagoCuota pendiente listo para Stripe Checkout (sin justificante manual).
     */
    public function createPendingPaymentForCheckout(User $user, int $planId, ?string $referenciaExterna = null): PagoCuota
    {
        if (! $user->hasPhysicalLocker()) {
            throw ValidationException::withMessages([
                'plan_id' => ['Necesitas una taquilla física asignada para contratar o renovar un plan. Contacta con el club.'],
            ]);
        }

        $plan = PlanTaquilla::query()->findOrFail($planId);
        if (! (bool) $plan->activo) {
            throw ValidationException::withMessages([
                'plan_id' => ['Este plan está desactivado. Selecciona uno vigente.'],
            ]);
        }

        $planCents = (int) $plan->precio_total_cents;

        $ultimoPago = PagoCuota::query()
            ->where('user_id', $user->id)
            ->orderByDesc('periodo_fin')
            ->first();

        $now = now()->startOfDay();
        $fechaInicio = $ultimoPago
            ? Carbon::parse($ultimoPago->periodo_fin)->addDay()->startOfDay()
            : $now;
        $fechaFin = (clone $fechaInicio)->addDays((int) $plan->duracion_dias)->subDay()->endOfDay();

        $referencia = is_string($referenciaExterna) && trim($referenciaExterna) !== ''
            ? trim($referenciaExterna)
            : $this->buildDefaultPaymentReference($user, $plan);

        return DB::transaction(function () use ($user, $plan, $planCents, $fechaInicio, $fechaFin, $referencia, $planId): PagoCuota {
            try {
                $lockedDuplicate = PagoCuota::query()
                    ->where('user_id', $user->id)
                    ->where('id_plan_pagado', $plan->id)
                    ->where('status', PagoCuota::STATUS_PENDING)
                    ->lockForUpdate()
                    ->exists();

                if ($lockedDuplicate) {
                    throw ValidationException::withMessages([
                        'plan_id' => ['Ya existe un pago pendiente para este plan.'],
                    ]);
                }

                $pago = PagoCuota::query()->create([
                    'user_id'                 => $user->id,
                    'id_plan_pagado'          => $plan->id,
                    'monto_pagado_cents'      => $planCents,
                    'status'                  => PagoCuota::STATUS_PENDING,
                    'referencia_pago_externa' => $referencia,
                    'periodo_inicio'          => $fechaInicio,
                    'periodo_fin'             => $fechaFin,
                    'fecha_pago'              => now(),
                    'payment_method'          => 'card',
                ]);

                $this->syncUserLockerCacheFromConfirmedPayments($user);

                return $pago;
            } catch (ValidationException $e) {
                throw $e;
            } catch (Throwable $e) {
                Log::error('taquilla.membership.create_pending_payment_failed', [
                    'action'  => 'create_pending_payment_checkout',
                    'user_id' => $user->id,
                    'plan_id' => $planId,
                    'error'   => $e->getMessage(),
                ]);

                throw $e;
            }
        });
    }

    /** Concepto legible para admin, emails y descripción en Stripe. */
    public function buildDefaultPaymentReference(User $user, PlanTaquilla $plan): string
    {
        $nombre = trim(trim((string) ($user->nombre ?? '')).' '.trim((string) ($user->apellido ?? '')));
        if ($nombre === '') {
            $nombre = trim((string) ($user->email ?? 'Socio S4'));
        }

        $planName = trim((string) ($plan->nombre ?? 'Plan taquilla'));
        $reference = "{$nombre} — {$planName}";

        if ($user->hasPhysicalLocker() && $user->numeroTaquilla !== null) {
            $withLocker = "{$reference} · T#{$user->numeroTaquilla}";
            if (mb_strlen($withLocker) <= 255) {
                $reference = $withLocker;
            }
        }

        return mb_substr($reference, 0, 255);
    }

    /** Rellena referencia en pagos pendientes antiguos antes de abrir Stripe. */
    public function ensurePaymentReference(PagoCuota $pago, User $user): PagoCuota
    {
        $current = trim((string) ($pago->referencia_pago_externa ?? ''));
        if ($current !== '') {
            return $pago;
        }

        $plan = $pago->plan ?? PlanTaquilla::query()->find($pago->id_plan_pagado);
        if ($plan === null) {
            return $pago;
        }

        $pago->update([
            'referencia_pago_externa' => $this->buildDefaultPaymentReference($user, $plan),
        ]);

        return $pago->fresh(['plan']);
    }

    /**
     * Confirma un PagoCuota tras webhook Stripe (sin intervención admin).
     */
    public function confirmPaymentFromGateway(int $pagoId): bool
    {
        $pago = PagoCuota::query()->with('plan')->find($pagoId);
        if ($pago === null) {
            return false;
        }

        if (($pago->status ?? '') === PagoCuota::STATUS_CONFIRMED) {
            return true;
        }

        $this->runTransactional(
            action: 'confirm_payment_gateway',
            actorUserId: (int) $pago->user_id,
            payload: ['pago_id' => $pagoId],
            callback: function () use ($pago): void {
                $lockedPago = PagoCuota::query()->whereKey($pago->id)->lockForUpdate()->firstOrFail();
                $targetUser = User::query()->whereKey($lockedPago->user_id)->lockForUpdate()->firstOrFail();

                if (($lockedPago->status ?? '') === PagoCuota::STATUS_CONFIRMED) {
                    return;
                }

                $lockedPago->update([
                    'status'         => PagoCuota::STATUS_CONFIRMED,
                    'payment_method' => 'card',
                    'reviewed_at'    => now(),
                ]);

                $this->syncUserLockerCacheFromConfirmedPayments($targetUser);
            },
        );

        $pagoConfirmado = PagoCuota::query()->with('plan')->findOrFail($pagoId);
        $usuario = User::query()->findOrFail($pagoConfirmado->user_id);

        event(new PagoTaquillaConfirmado(
            pago: $pagoConfirmado,
            usuario: $usuario,
            lockerNumber: $usuario->numeroTaquilla !== null ? (int) $usuario->numeroTaquilla : null,
        ));

        return true;
    }

    public function registerPayment(User $user, RegistrarPagoTaquillaRequest $request): void
    {
        if (! $user->hasPhysicalLocker()) {
            throw ValidationException::withMessages([
                'plan_id' => ['Necesitas una taquilla física asignada para contratar o renovar un plan. Contacta con el club.'],
            ]);
        }

        $validated = $request->validated();
        $payload = [
            'plan_id' => (int) $validated['plan_id'],
            'monto_pagado' => $validated['monto_pagado'] ?? null,
            'referencia_pago_externa' => $validated['referencia_pago_externa'] ?? null,
            'payment_method' => $validated['payment_method'] ?? null,
        ];

        $plan = PlanTaquilla::query()->findOrFail($payload['plan_id']);
        if (! (bool) $plan->activo) {
            throw ValidationException::withMessages([
                'plan_id' => ['Este plan esta desactivado. Selecciona uno vigente.'],
            ]);
        }

        $planCents = (int) $plan->precio_total_cents;
        if (! MoneyCents::amountsMatchCents($planCents, $payload['monto_pagado'])) {
            throw ValidationException::withMessages([
                'monto_pagado' => ['El importe no coincide con el precio real del plan.'],
            ]);
        }

        $ultimoPago = PagoCuota::query()
            ->where('user_id', $user->id)
            ->orderByDesc('periodo_fin')
            ->first();

        $now = now()->startOfDay();
        $fechaInicio = $ultimoPago
            ? Carbon::parse($ultimoPago->periodo_fin)->addDay()->startOfDay()
            : $now;
        $fechaFin = (clone $fechaInicio)->addDays((int) $plan->duracion_dias)->subDay()->endOfDay();

        $pendingDuplicate = PagoCuota::query()
            ->where('user_id', $user->id)
            ->where('id_plan_pagado', $plan->id)
            ->where('status', PagoCuota::STATUS_PENDING)
            ->exists();

        if ($pendingDuplicate) {
            throw ValidationException::withMessages([
                'plan_id' => ['Ya tienes una renovacion pendiente de validacion para este plan.'],
            ]);
        }

        $this->runTransactional(
            action: 'register_payment',
            actorUserId: (int) $user->id,
            payload: $payload,
            callback: function () use ($user, $plan, $planCents, $validated, $fechaInicio, $fechaFin, $request): void {
                $lockedDuplicate = PagoCuota::query()
                    ->where('user_id', $user->id)
                    ->where('id_plan_pagado', $plan->id)
                    ->where('status', PagoCuota::STATUS_PENDING)
                    ->lockForUpdate()
                    ->exists();

                if ($lockedDuplicate) {
                    throw ValidationException::withMessages([
                        'plan_id' => ['Ya existe un pago pendiente para este plan.'],
                    ]);
                }

                $pago = PagoCuota::query()->create([
                    'user_id' => $user->id,
                    'id_plan_pagado' => $plan->id,
                    'monto_pagado_cents' => $planCents,
                    'status' => PagoCuota::STATUS_PENDING,
                    'referencia_pago_externa' => $validated['referencia_pago_externa'] ?? null,
                    'periodo_inicio' => $fechaInicio,
                    'periodo_fin' => $fechaFin,
                    'fecha_pago' => now(),
                ]);

                $path = $this->storeProofFile(
                    pagoId: (int) $pago->id,
                    proof: $request->file('proof'),
                );

                $pago->update([
                    'payment_proof_path' => $path,
                    'proof_uploaded_at' => now(),
                    'payment_method' => $validated['payment_method'] ?? null,
                ]);

                $this->syncUserLockerCacheFromConfirmedPayments($user);
            },
        );
    }

    public function uploadProof(User $user, PagoCuota $pago, SubirJustificanteTaquillaRequest $request): void
    {
        if ((int) $pago->user_id !== (int) $user->id) {
            abort(403);
        }

        $validated = $request->validated();
        $payload = ['pago_id' => $pago->id, 'payment_method' => $validated['payment_method'] ?? null];

        $this->runTransactional(
            action: 'upload_proof',
            actorUserId: (int) $user->id,
            payload: $payload,
            callback: function () use ($pago, $request, $validated): void {
                $locked = PagoCuota::query()->whereKey($pago->id)->lockForUpdate()->firstOrFail();

                $oldPath = $locked->payment_proof_path;
                if ($oldPath && Storage::disk('local')->exists($oldPath)) {
                    Storage::disk('local')->delete($oldPath);
                }

                $path = $this->storeProofFile(
                    pagoId: (int) $locked->id,
                    proof: $request->file('proof'),
                );

                $locked->update([
                    'payment_proof_path' => $path,
                    'proof_uploaded_at' => now(),
                    'reviewed_at' => null,
                    'payment_method' => $validated['payment_method'] ?? null,
                    'status' => PagoCuota::STATUS_PENDING,
                ]);
            },
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function buildPaymentQueuePayload(string $status, string $search, bool $pendingOnly): array
    {
        $rows = PagoCuota::query()
            ->with([
                'user:id,nombre,apellido,email,telefono,numeroTaquilla,fecha_vencimiento_cuota',
                'plan:id,nombre,duracion_dias,precio_total_cents',
            ])
            ->when($status !== 'all', fn ($q) => $q->where('status', $status))
            ->when($pendingOnly, fn ($q) => $q->whereNull('reviewed_at'))
            ->when($search !== '', function ($q) use ($search): void {
                $q->where(function ($outer) use ($search): void {
                    $outer->whereHas('user', function ($u) use ($search): void {
                        $u->where('nombre', 'like', "%{$search}%")
                            ->orWhere('apellido', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");

                        if (ctype_digit($search)) {
                            $u->orWhere('numeroTaquilla', (int) $search);
                        }
                    });

                    $outer->orWhere('referencia_pago_externa', 'like', "%{$search}%");

                    if (ctype_digit($search)) {
                        $outer->orWhereKey((int) $search);
                    }
                });
            })
            ->orderByDesc('created_at')
            ->limit(300)
            ->get();

        $userOptionsSource = User::query()
            ->select('id', 'nombre', 'apellido', 'email', 'telefono', 'numeroTaquilla', 'fecha_vencimiento_cuota')
            ->orderBy('nombre')
            ->orderBy('apellido')
            ->get();

        $lockerUsersSource = User::query()
            ->whereNotNull('numeroTaquilla')
            ->orderBy('numeroTaquilla')
            ->get(['id', 'nombre', 'apellido', 'email', 'telefono', 'numeroTaquilla', 'fecha_vencimiento_cuota']);

        $index = $this->lockerPaymentIndex->build(
            $userOptionsSource->pluck('id')->merge($lockerUsersSource->pluck('id'))->unique(),
        );

        $availabilityUserIds = $rows->pluck('user_id')
            ->merge($lockerUsersSource->pluck('id'))
            ->unique()
            ->values();
        $availabilityMap = $this->lockerPaymentIndex->computeAvailabilityMap($availabilityUserIds);

        return [
            'rows' => $this->enrichQueueRowsWithReceipts($rows, $availabilityMap),
            'activePlanSummary' => $this->buildActivePlanSummaryToday(),
            'counts' => [
                'all' => (int) PagoCuota::query()->count(),
                'pending' => (int) PagoCuota::query()->where('status', PagoCuota::STATUS_PENDING)->count(),
                'confirmed' => (int) PagoCuota::query()->where('status', PagoCuota::STATUS_CONFIRMED)->count(),
                'rejected' => (int) PagoCuota::query()->where('status', PagoCuota::STATUS_REJECTED)->count(),
                'unreviewed' => (int) PagoCuota::query()->whereNull('reviewed_at')->count(),
            ],
            'filters' => [
                'status' => $status,
                'search' => $search,
                'pending_review' => $pendingOnly,
            ],
            'userOptions' => $userOptionsSource
                ->map(fn (User $u) => [
                    'id' => $u->id,
                    'name' => trim(($u->nombre ?? '').' '.($u->apellido ?? '')),
                    'email' => $u->email,
                    'phone' => $u->telefono,
                    'locker' => $u->numeroTaquilla,
                    'plan_status' => $this->lockerPaymentIndex->resolvePlanStatus($u, $index),
                ])
                ->values(),
            'lockerUsers' => $lockerUsersSource
                ->map(function (User $u) use ($index, $availabilityMap): array {
                    $row = $this->lockerPaymentIndex->mapLockerUserRow($u, $index);

                    return $this->mergeTaquillaAvailability($row, $availabilityMap[(int) $u->id] ?? null);
                })
                ->values(),
            'lockerGrid' => $this->buildLockerGrid(),
        ];
    }

    public function markReviewed(PagoCuota $pago): void
    {
        $this->runTransactional(
            action: 'mark_reviewed',
            actorUserId: (int) $pago->user_id,
            payload: ['pago_id' => $pago->id],
            callback: function () use ($pago): void {
                PagoCuota::query()->whereKey($pago->id)->lockForUpdate()->firstOrFail()
                    ->update(['reviewed_at' => now()]);
            },
        );
    }

    public function updatePaymentState(PagoCuota $pago, UpdatePagoTaquillaPaymentStateRequest $request): void
    {
        $validated = $request->validated();
        $nextState = (string) $validated['pago_state'];
        $failureReason = trim((string) ($validated['failure_reason'] ?? ''));

        if ($nextState === 'failed' && $failureReason === '') {
            throw ValidationException::withMessages([
                'failure_reason' => ['Indica el motivo del pago fallido.'],
            ]);
        }

        $mapMethod = [
            'online' => 'card',
            'transferencia' => 'transferencia',
            'metalico' => 'tienda',
            'datafono' => 'datafono',
            'domiciliado' => 'domiciliado',
        ];

        $nextStatus = match ($nextState) {
            'failed' => PagoCuota::STATUS_REJECTED,
            default => PagoCuota::STATUS_CONFIRMED,
        };

        $this->runTransactional(
            action: 'update_payment_state',
            actorUserId: (int) $pago->user_id,
            payload: ['pago_id' => $pago->id, 'pago_state' => $nextState],
            callback: function () use ($pago, $nextStatus, $nextState, $mapMethod, $failureReason): void {
                $locked = PagoCuota::query()->whereKey($pago->id)->lockForUpdate()->firstOrFail();
                $locked->update([
                    'status' => $nextStatus,
                    'payment_method' => $mapMethod[$nextState] ?? null,
                    'admin_notes' => $nextState === 'failed' ? $failureReason : null,
                    'reviewed_at' => null,
                ]);

                if ($nextStatus === PagoCuota::STATUS_CONFIRMED) {
                    $this->syncUserLockerCacheFromConfirmedPayments($locked->user);
                }
            },
        );
    }

    public function updateCheckedState(PagoCuota $pago, UpdatePagoTaquillaCheckedStateRequest $request): void
    {
        $isChecked = (bool) $request->validated('is_checked');

        $this->runTransactional(
            action: 'update_checked_state',
            actorUserId: (int) $pago->user_id,
            payload: ['pago_id' => $pago->id, 'is_checked' => $isChecked],
            callback: function () use ($pago, $isChecked): void {
                PagoCuota::query()->whereKey($pago->id)->lockForUpdate()->firstOrFail()
                    ->update([
                        'is_checked' => $isChecked,
                        'reviewed_at' => null,
                    ]);
            },
        );
    }

    public function confirmPayment(PagoCuota $pago, User $admin, ConfirmarPagoTaquillaRequest $request): void
    {
        if (($pago->status ?? '') === PagoCuota::STATUS_CONFIRMED) {
            throw ValidationException::withMessages([
                'pago' => ['Este pago ya esta confirmado.'],
            ]);
        }

        $lockerNumber = $request->filled('locker_number')
            ? (int) $request->validated('locker_number')
            : null;

        $this->runTransactional(
            action: 'confirm_payment',
            actorUserId: (int) $pago->user_id,
            payload: [
                'pago_id' => $pago->id,
                'admin_id' => $admin->id,
                'locker_number' => $lockerNumber,
            ],
            callback: function () use ($pago, $admin, $lockerNumber): void {
                $lockedPago = PagoCuota::query()->whereKey($pago->id)->lockForUpdate()->firstOrFail();
                $targetUser = User::query()->whereKey($lockedPago->user_id)->lockForUpdate()->firstOrFail();

                if ($lockerNumber !== null && $lockerNumber > 0) {
                    $this->assignLockerToUser(
                        target: $targetUser,
                        admin: $admin,
                        lockerNumber: $lockerNumber,
                        action: 'assign_from_payment_approval',
                        notes: 'Asignacion durante confirmacion de pago.',
                    );
                }

                $lockedPago->update([
                    'status' => PagoCuota::STATUS_CONFIRMED,
                    'reviewed_at' => null,
                ]);

                $this->syncUserLockerCacheFromConfirmedPayments($targetUser);
            },
        );

        // Efectos secundarios desacoplados: solo tras commit correcto de la transaccion.
        $pagoConfirmado = PagoCuota::query()->with('plan')->findOrFail($pago->id);
        $usuarioAsignado = User::query()->findOrFail($pagoConfirmado->user_id);

        event(new PagoTaquillaConfirmado(
            pago: $pagoConfirmado,
            usuario: $usuarioAsignado,
            lockerNumber: $usuarioAsignado->numeroTaquilla !== null ? (int) $usuarioAsignado->numeroTaquilla : null,
        ));
    }

    public function rejectPayment(PagoCuota $pago, RechazarPagoTaquillaRequest $request): void
    {
        if (($pago->status ?? '') === PagoCuota::STATUS_REJECTED) {
            throw ValidationException::withMessages([
                'pago' => ['Este pago ya esta rechazado.'],
            ]);
        }

        $notes = $request->validated('admin_notes') ?? 'Comprobante rechazado.';

        $this->runTransactional(
            action: 'reject_payment',
            actorUserId: (int) $pago->user_id,
            payload: ['pago_id' => $pago->id, 'admin_notes' => $notes],
            callback: function () use ($pago, $notes): void {
                PagoCuota::query()->whereKey($pago->id)->lockForUpdate()->firstOrFail()
                    ->update([
                        'status' => PagoCuota::STATUS_REJECTED,
                        'admin_notes' => $notes,
                        'reviewed_at' => null,
                    ]);
            },
        );

        // Efectos secundarios desacoplados: solo tras commit correcto de la transaccion.
        $pagoRechazado = PagoCuota::query()->with('plan')->findOrFail($pago->id);
        $usuarioAfectado = User::query()->findOrFail($pagoRechazado->user_id);

        event(new PagoTaquillaRechazado(
            pago: $pagoRechazado,
            usuario: $usuarioAfectado,
            motivo: $notes,
        ));
    }

    public function reassignLocker(User $target, User $admin, ReassignLockerRequest $request): void
    {
        $locker = (int) $request->validated('locker_number');

        $this->runTransactional(
            action: 'reassign_locker',
            actorUserId: (int) $target->id,
            payload: ['target_user_id' => $target->id, 'locker_number' => $locker, 'admin_id' => $admin->id],
            callback: function () use ($target, $admin, $locker): void {
                $lockedTarget = User::query()->whereKey($target->id)->lockForUpdate()->firstOrFail();
                $this->assignLockerToUser(
                    target: $lockedTarget,
                    admin: $admin,
                    lockerNumber: $locker,
                    action: 'manual_reassign',
                    notes: 'Reasignacion manual desde tabla de taquillas.',
                );
            },
        );
    }

    public function storePlan(StorePlanTaquillaRequest $request): PlanTaquilla
    {
        $validated = $request->validated();

        $plan = PlanTaquilla::query()->create([
            'nombre' => $validated['nombre'],
            'precio_total_cents' => MoneyCents::eurosToCents($validated['precio_total']),
            'duracion_dias' => (int) $validated['duracion_meses'] * 30,
            'activo' => (bool) ($validated['visible'] ?? true),
        ]);

        $this->chatbotBusinessContext->forget();

        return $plan;
    }

    public function updatePlan(PlanTaquilla $plan, UpdatePlanTaquillaRequest $request): void
    {
        $validated = $request->validated();

        $plan->update([
            'nombre' => $validated['nombre'],
            'precio_total_cents' => MoneyCents::eurosToCents($validated['precio_total']),
            'duracion_dias' => (int) $validated['duracion_meses'] * 30,
            'activo' => (bool) ($validated['visible'] ?? true),
        ]);

        $this->chatbotBusinessContext->forget();
    }

    public function togglePlanActive(PlanTaquilla $plan): bool
    {
        $plan->update(['activo' => ! (bool) $plan->activo]);

        $this->chatbotBusinessContext->forget();

        return (bool) $plan->activo;
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function userPaymentHistory(User $user): array
    {
        return PagoCuota::query()
            ->with('plan:id,nombre,duracion_dias')
            ->where('user_id', $user->id)
            ->orderByDesc('periodo_inicio')
            ->limit(50)
            ->get()
            ->map(fn (PagoCuota $p) => [
                'id' => $p->id,
                'plan' => $p->plan?->nombre ?? 'Sin plan',
                'periodo_inicio' => optional($p->periodo_inicio)->toDateString(),
                'periodo_fin' => optional($p->periodo_fin)->toDateString(),
                'status' => $p->status ?? PagoCuota::STATUS_PENDING,
                'payment_method' => $p->payment_method,
                'is_checked' => (bool) ($p->is_checked ?? false),
                'proof_url' => $p->payment_proof_path ? route('taquilla.pagos.proof', $p->id) : null,
            ])
            ->values()
            ->all();
    }

    /**
     * @return array{telefono: string|null, email: string|null}
     */
    public function userContact(User $user): array
    {
        return [
            'telefono' => $user->telefono,
            'email' => $user->email,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function userDatosPayload(User $user): array
    {
        $now = now();
        $planVigente = PagoCuota::query()
            ->where('user_id', $user->id)
            ->where('status', PagoCuota::STATUS_CONFIRMED)
            ->where('periodo_inicio', '<=', $now)
            ->where('periodo_fin', '>=', $now)
            ->orderByDesc('periodo_fin')
            ->with('plan')
            ->first();

        $diasRestantes = $planVigente ? $now->diffInDays($planVigente->periodo_fin, false) : 0;

        $historial = PagoCuota::query()
            ->where('user_id', $user->id)
            ->with('plan')
            ->orderByDesc('periodo_inicio')
            ->get();

        return [
            'success' => true,
            'nombre_completo' => trim(($user->nombre ?? '').' '.($user->apellido ?? '')),
            'numero_taquilla' => $user->numeroTaquilla,
            'vencimiento_actualizado' => $user->fecha_vencimiento_cuota?->toDateString(),
            'plan_vigente' => $planVigente ? [
                'nombre' => $planVigente->plan->nombre,
                'precio' => $planVigente->plan->precio_total,
                'dias_restantes' => $diasRestantes,
                'fecha_fin' => $planVigente->periodo_fin->toDateString(),
            ] : null,
            'historial' => $historial->map(fn (PagoCuota $p) => [
                'id' => $p->id,
                'status' => $p->status ?? PagoCuota::STATUS_PENDING,
                'monto_pagado' => $p->monto_pagado,
                'referencia_pago_externa' => $p->referencia_pago_externa,
                'periodo_inicio' => optional($p->periodo_inicio)->toDateString(),
                'periodo_fin' => optional($p->periodo_fin)->toDateString(),
                'plan' => [
                    'id' => $p->plan->id ?? null,
                    'nombre' => $p->plan->nombre ?? null,
                ],
            ]),
            'ultimo_plan_fin' => $user->fecha_vencimiento_cuota?->toDateString(),
        ];
    }

    public function syncUserLockerCacheFromConfirmedPayments(User $user): void
    {
        $now = now();
        $planVigente = PagoCuota::query()
            ->where('user_id', $user->id)
            ->where('status', PagoCuota::STATUS_CONFIRMED)
            ->where('periodo_inicio', '<=', $now)
            ->where('periodo_fin', '>=', $now)
            ->orderByDesc('periodo_fin')
            ->first();

        $user->update([
            'fecha_vencimiento_cuota' => $planVigente?->periodo_fin,
            'id_plan_vigente' => $planVigente?->id_plan_pagado,
        ]);
    }

    /**
     * @return array{max: int, occupied: Collection<int, int>}
     */
    private function buildLockerGrid(): array
    {
        $occupied = User::query()
            ->whereNotNull('numeroTaquilla')
            ->pluck('numeroTaquilla')
            ->map(fn ($n) => (int) $n)
            ->unique()
            ->values();

        return [
            'max' => max(60, ((int) $occupied->max() + 20)),
            'occupied' => $occupied,
        ];
    }

    private function assignLockerToUser(
        User $target,
        User $admin,
        int $lockerNumber,
        string $action,
        string $notes,
    ): void {
        $ocupante = User::query()
            ->where('numeroTaquilla', $lockerNumber)
            ->lockForUpdate()
            ->first();

        if ($ocupante && (int) $ocupante->id !== (int) $target->id) {
            abort(422, 'La taquilla seleccionada ya esta ocupada.');
        }

        $fromLocker = $target->numeroTaquilla;
        $target->numeroTaquilla = $lockerNumber;
        $target->save();

        DB::table('taquilla_audit_logs')->insert([
            'admin_id' => $admin->id,
            'user_id' => $target->id,
            'action' => $action,
            'from_locker' => $fromLocker,
            'to_locker' => $lockerNumber,
            'notes' => $notes,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /**
     * @param  \Illuminate\Support\Collection<int, PagoCuota>  $rows
     * @return list<array<string, mixed>>
     */
    private function enrichQueueRowsWithReceipts(Collection $rows, array $availabilityMap = []): array
    {
        $rowsList = $rows->values();
        $resolved = PagoCuotaQueueResource::collection($rowsList)->resolve();
        $receiptMap = $this->paymentReceipts->proofMetaMapForPayables(
            $rowsList->map(fn (PagoCuota $pago) => ['type' => PagoCuota::class, 'id' => (int) $pago->id])->all(),
        );

        foreach ($resolved as $index => $row) {
            $pago = $rowsList->get($index);
            if ($pago === null) {
                continue;
            }

            $manualProofUrl = ! empty($pago->payment_proof_path)
                ? route('taquilla.pagos.proof', $pago->id)
                : null;
            $proof = $this->paymentReceipts->proofFieldsForPayable(
                PagoCuota::class,
                (int) $pago->id,
                ! empty($pago->payment_proof_path),
                $manualProofUrl,
                $receiptMap,
            );

            $row['proof_url'] = $proof['proof_url'];
            $row['proof_is_stripe_receipt'] = $proof['proof_is_stripe_receipt'];
            $row = $this->mergeTaquillaAvailability($row, $availabilityMap[(int) ($pago->user_id ?? 0)] ?? null);
            $resolved[$index] = $row;
        }

        return $resolved;
    }

    /**
     * @param  array<string, mixed>  $row
     * @param  array<string, mixed>|null  $availability
     * @return array<string, mixed>
     */
    private function mergeTaquillaAvailability(array $row, ?array $availability): array
    {
        if ($availability === null) {
            $row['taquilla_total_days_remaining'] = null;
            $row['taquilla_current_days_remaining'] = null;
            $row['taquilla_prepaid_extra_days'] = 0;
            $row['taquilla_current_expires_at'] = null;
            $row['taquilla_final_expires_at'] = null;

            return $row;
        }

        $row['taquilla_total_days_remaining'] = $availability['total_days_remaining'] ?? null;
        $row['taquilla_current_days_remaining'] = $availability['current_days_remaining'] ?? null;
        $row['taquilla_prepaid_extra_days'] = (int) ($availability['prepaid_extra_days'] ?? 0);
        $row['taquilla_current_expires_at'] = $availability['current_expires_at'] ?? null;
        $row['taquilla_final_expires_at'] = $availability['final_expires_at'] ?? null;

        return $row;
    }

    /**
     * Socios con periodo de cuota activo hoy, agrupados por tipo de plan.
     *
     * @return array{as_of: string, as_of_human: string, total: int, items: list<array{label: string, count: int, sort: int}>}
     */
    private function buildActivePlanSummaryToday(): array
    {
        $today = Carbon::today();

        $activeRows = PagoCuota::query()
            ->from('pagos_cuotas as pc')
            ->join('users as u', 'u.id', '=', 'pc.user_id')
            ->join('planes_taquilla as pt', 'pt.id', '=', 'pc.id_plan_pagado')
            ->where('pc.status', PagoCuota::STATUS_CONFIRMED)
            ->whereDate('pc.periodo_inicio', '<=', $today)
            ->whereDate('pc.periodo_fin', '>=', $today)
            ->whereNotNull('u.numeroTaquilla')
            ->selectRaw('pc.user_id, pt.nombre as plan_nombre, pt.duracion_dias as plan_duracion_dias')
            ->get()
            ->unique('user_id');

        $grouped = [];

        foreach ($activeRows as $row) {
            $short = $this->resolveShortPlanLabel(
                (string) ($row->plan_nombre ?? ''),
                (int) ($row->plan_duracion_dias ?? 0),
            );
            $adjective = $this->planSummaryAdjective($short);
            $sort = $this->planSummarySortOrder($short);

            if (! isset($grouped[$adjective])) {
                $grouped[$adjective] = ['label' => $adjective, 'count' => 0, 'sort' => $sort];
            }

            $grouped[$adjective]['count']++;
        }

        $items = array_values($grouped);
        usort($items, static fn (array $a, array $b): int => $b['sort'] <=> $a['sort']);

        $total = array_sum(array_column($items, 'count'));

        return [
            'as_of' => $today->toDateString(),
            'as_of_human' => $today->locale('es')->translatedFormat('j \d\e F \d\e Y'),
            'total' => $total,
            'items' => array_map(
                static fn (array $item): array => ['label' => $item['label'], 'count' => $item['count']],
                $items,
            ),
        ];
    }

    private function resolveShortPlanLabel(string $nombre, int $duracionDias): string
    {
        $normalized = mb_strtolower(trim($nombre));

        if (str_contains($normalized, 'anual') || $duracionDias >= 330) {
            return '1 año';
        }
        if (str_contains($normalized, 'semestral') || $duracionDias >= 150) {
            return '6 meses';
        }
        if (str_contains($normalized, 'trimestral') || $duracionDias >= 80) {
            return '3 meses';
        }
        if (str_contains($normalized, 'bimestral') || $duracionDias >= 55) {
            return '2 meses';
        }
        if (str_contains($normalized, 'mensual') || $duracionDias >= 25) {
            return '1 mes';
        }

        return $nombre !== '' ? $nombre : 'Otro';
    }

    private function planSummaryAdjective(string $shortLabel): string
    {
        return match ($shortLabel) {
            '1 año' => 'anuales',
            '6 meses' => 'semestrales',
            '3 meses' => 'trimestrales',
            '2 meses' => 'bimestrales',
            '1 mes' => 'mensuales',
            default => mb_strtolower($shortLabel),
        };
    }

    private function planSummarySortOrder(string $shortLabel): int
    {
        return match ($shortLabel) {
            '1 año' => 500,
            '6 meses' => 400,
            '3 meses' => 300,
            '2 meses' => 200,
            '1 mes' => 100,
            default => 0,
        };
    }

    private function storeProofFile(int $pagoId, UploadedFile $proof): string
    {
        $ext = strtolower((string) $proof->getClientOriginalExtension());
        $fileName = Str::uuid()->toString().'.'.$ext;

        return $proof->storeAs('taquilla-proofs/'.$pagoId, $fileName, 'local');
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function runTransactional(string $action, int $actorUserId, array $payload, callable $callback): void
    {
        try {
            DB::transaction($callback);
        } catch (ValidationException $e) {
            throw $e;
        } catch (Throwable $e) {
            Log::error('taquilla.membership.transaction_failed', [
                'action' => $action,
                'user_id' => $actorUserId,
                'payload' => $payload,
                'error' => $e->getMessage(),
                'exception' => $e::class,
                'trace' => $e->getTraceAsString(),
            ]);

            throw $e;
        }
    }
}
