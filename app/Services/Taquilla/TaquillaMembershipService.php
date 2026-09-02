<?php

declare(strict_types=1);

namespace App\Services\Taquilla;

use App\DTOs\Taquilla\LockerOccupancyMapDto;
use App\DTOs\Taquilla\LockerOccupantDto;
use App\DTOs\Taquilla\LockerReleaseResultDto;
use App\DTOs\Taquilla\PlanTaquillaPublicDto;
use App\Events\Taquilla\PagoTaquillaConfirmado;
use App\Http\Requests\Taquilla\ReassignLockerRequest;
use App\Http\Requests\Taquilla\StorePlanTaquillaRequest;
use App\Http\Requests\Taquilla\UpdatePlanTaquillaRequest;
use App\Http\Resources\PagoCuotaRegistryResource;
use App\Models\PagoCuota;
use App\Models\PaymentWebhookIdempotency;
use App\Models\PlanTaquilla;
use App\Models\User;
use App\Services\Chatbot\S4BusinessContextService;
use App\Services\Invoicing\FiscalInvoiceAccessService;
use App\Services\Payments\PaymentReceiptAccessService;
use App\Support\MoneyCents;
use App\Support\VipVirtualLocker;
use Carbon\Carbon;
use Illuminate\Database\QueryException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Throwable;

class TaquillaMembershipService
{
    public function __construct(
        private readonly LockerPaymentIndexBuilder $lockerPaymentIndex,
        private readonly S4BusinessContextService $chatbotBusinessContext,
        private readonly PaymentReceiptAccessService $paymentReceipts,
        private readonly FiscalInvoiceAccessService $fiscalInvoices,
    ) {}

    /**
     * @return list<array{id: int, nombre: string, precio_total: float, duracion_dias: int, activo: bool}>
     */
    public function buildAdminPlansPayload(): array
    {
        return PlanTaquilla::query()
            ->orderByDesc('activo')
            ->orderBy('precio_total_cents')
            ->get(['id', 'nombre', 'precio_total_cents', 'duracion_dias', 'activo'])
            ->map(fn (PlanTaquilla $plan): array => [
                'id' => (int) $plan->id,
                'nombre' => (string) $plan->nombre,
                'precio_total' => MoneyCents::centsToEuros((int) $plan->precio_total_cents),
                'duracion_dias' => (int) $plan->duracion_dias,
                'activo' => (bool) $plan->activo,
            ])
            ->values()
            ->all();
    }

    /**
     * Socios con taquilla: vigencia de cuota (sin historial de pagos; se carga bajo demanda).
     *
     * @return list<array<string, mixed>>
     */
    public function buildVigenciaPayload(): array
    {
        $this->applyDueScheduledAltas();
        $today = now()->startOfDay();

        return User::query()
            ->whereNotNull('numeroTaquilla')
            ->with([
                'planVigente:id,nombre,duracion_dias,activo',
                'pagosCuotas' => function ($q): void {
                    $q->where('status', PagoCuota::STATUS_CONFIRMED)
                        ->select('id', 'user_id', 'id_plan_pagado', 'periodo_inicio', 'periodo_fin', 'status')
                        ->orderBy('periodo_inicio');
                },
            ])
            ->orderBy('numeroTaquilla')
            ->get()
            ->map(function (User $u) use ($today): array {
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
                    $fechaFin = Carbon::parse($activeRow->periodo_fin)->startOfDay();
                    $diasRestantes = (int) $today->diffInDays($fechaFin, false);
                    $estado = 'activo';
                    $ultimoPagoStr = optional($activeRow->periodo_inicio)->toDateString();
                    $fechaFinStr = optional($activeRow->periodo_fin)->toDateString();
                    $prepaidExtraDays = (int) $confirmedRows
                        ->filter(fn ($p) => $p->periodo_inicio && Carbon::parse($p->periodo_inicio)->startOfDay()->gt($fechaFin))
                        ->sum(function ($p): int {
                            if (! $p->periodo_inicio || ! $p->periodo_fin) {
                                return 0;
                            }
                            $start = Carbon::parse($p->periodo_inicio)->startOfDay();
                            $end = Carbon::parse($p->periodo_fin)->startOfDay();

                            return (int) ($start->diffInDays($end) + 1);
                        });
                } else {
                    // Sin cobertura hoy.
                    // 1) Si hubo un periodo ya empezado y terminado → vencido (días negativos)
                    //    + badge de prepago futuro si existe.
                    // 2) Si solo hay periodos futuros confirmados → activo hasta su fin
                    //    (evita rojo con "N días restantes").
                    // 3) Si no hay ningún pago confirmado (nunca pagó) → 'sin plan',
                    //    distinto de 'vencido' (una cuota que caducó sí tuvo cobertura antes).
                    $lastStarted = $confirmedRows
                        ->filter(fn ($p) => $p->periodo_inicio && $p->periodo_fin
                            && Carbon::parse($p->periodo_inicio)->startOfDay()->lte($today))
                        ->sortByDesc(fn ($p) => Carbon::parse($p->periodo_fin)->timestamp)
                        ->first();

                    $sumPrepaidAfter = function ($anchorEnd) use ($confirmedRows): int {
                        return (int) $confirmedRows
                            ->filter(fn ($p) => $p->periodo_inicio && Carbon::parse($p->periodo_inicio)->startOfDay()->gt($anchorEnd))
                            ->sum(function ($p): int {
                                if (! $p->periodo_inicio || ! $p->periodo_fin) {
                                    return 0;
                                }
                                $start = Carbon::parse($p->periodo_inicio)->startOfDay();
                                $end = Carbon::parse($p->periodo_fin)->startOfDay();

                                return (int) ($start->diffInDays($end) + 1);
                            });
                    };

                    if ($lastStarted) {
                        $fechaFin = Carbon::parse($lastStarted->periodo_fin)->startOfDay();
                        $diasRestantes = (int) $today->diffInDays($fechaFin, false);
                        $ultimoPagoStr = optional($lastStarted->periodo_inicio)->toDateString();
                        $fechaFinStr = optional($lastStarted->periodo_fin)->toDateString();
                        $estado = $diasRestantes >= 0 ? 'activo' : 'vencido';
                        $prepaidExtraDays = $sumPrepaidAfter($fechaFin);
                    } else {
                        $futureRow = $confirmedRows
                            ->filter(fn ($p) => $p->periodo_inicio && $p->periodo_fin
                                && Carbon::parse($p->periodo_inicio)->startOfDay()->gt($today))
                            ->sortBy(fn ($p) => Carbon::parse($p->periodo_inicio)->timestamp)
                            ->first();

                        if ($futureRow) {
                            $fechaFin = Carbon::parse($futureRow->periodo_fin)->startOfDay();
                            $diasRestantes = (int) $today->diffInDays($fechaFin, false);
                            $ultimoPagoStr = optional($futureRow->periodo_inicio)->toDateString();
                            $fechaFinStr = optional($futureRow->periodo_fin)->toDateString();
                            $estado = $diasRestantes >= 0 ? 'activo' : 'vencido';
                            // Solo periodos encadenados posteriores cuentan como prepago extra.
                            $prepaidExtraDays = $sumPrepaidAfter($fechaFin);
                        } else {
                            // Nunca hubo un pago confirmado para esta taquilla.
                            $estado = 'sin plan';
                        }
                    }
                }

                $altaProgramadaEl = $u->taquilla_alta_programada_at
                    ? $u->taquilla_alta_programada_at->toDateString()
                    : null;
                if ($altaProgramadaEl !== null
                    && Carbon::parse($altaProgramadaEl)->startOfDay()->greaterThan($today)) {
                    $estado = 'alta programada';
                }

                return [
                    'id' => $u->id,
                    'nombre' => $u->nombre,
                    'apellido' => $u->apellido,
                    'email' => $u->email,
                    'telefono' => $u->telefono,
                    'numeroTaquilla' => $u->numeroTaquilla,
                    'alta_programada_el' => $altaProgramadaEl,
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
                    'baja_solicitada_at' => optional($u->taquilla_baja_solicitada_at)->toIso8601String(),
                ];
            })
            ->values()
            ->all();
    }

    /**
     * Ex-socios: sin plaza asignada pero con historial de taquilla (algún pago o una
     * baja registrada). Es la lista corta desde la que se readmite a quien vuelve;
     * volcar todos los usuarios registrados reventaría el payload.
     *
     * @return list<array<string, mixed>>
     */
    public function buildExSociosPayload(): array
    {
        return User::query()
            ->whereNull('numeroTaquilla')
            ->where(function ($q) {
                $q->whereNotNull('taquilla_baja_efectiva_at')
                    ->orWhereHas('pagosCuotas');
            })
            ->withMax('pagosCuotas as ultimo_periodo_fin', 'periodo_fin')
            ->orderByDesc('taquilla_baja_efectiva_at')
            ->orderBy('nombre')
            ->get(['id', 'nombre', 'apellido', 'email', 'telefono', 'is_vip',
                'taquilla_baja_efectiva_at', 'taquilla_alta_at'])
            ->map(fn (User $u): array => [
                'id' => (int) $u->id,
                'nombre' => (string) ($u->nombre ?? ''),
                'apellido' => (string) ($u->apellido ?? ''),
                'email' => (string) ($u->email ?? ''),
                'telefono' => $u->telefono !== null ? (string) $u->telefono : null,
                'is_vip' => (bool) $u->is_vip,
                'baja_efectiva_at' => optional($u->taquilla_baja_efectiva_at)->toIso8601String(),
                'alta_at' => optional($u->taquilla_alta_at)->toIso8601String(),
                'ultimo_periodo_fin' => $u->ultimo_periodo_fin !== null
                    ? Carbon::parse($u->ultimo_periodo_fin)->toDateString()
                    : null,
            ])
            ->values()
            ->all();
    }

    public function toggleBajaSolicitada(User $user): User
    {
        return DB::transaction(function () use ($user): User {
            $locked = User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();
            $locked->taquilla_baja_solicitada_at = $locked->taquilla_baja_solicitada_at ? null : now();
            $locked->save();

            return $locked->fresh();
        });
    }

    /**
     * Baja efectiva pedida por el socio: libera la taquilla y limpia el aviso.
     * No toca is_vip (eso sigue en el asignador / flujo VIP).
     */
    public function confirmarBajaTaquilla(User $user): User
    {
        return DB::transaction(function () use ($user): User {
            $locked = User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();

            if ($locked->taquilla_baja_solicitada_at === null) {
                throw ValidationException::withMessages([
                    'user' => ['Este socio no tiene un aviso de baja marcado.'],
                ]);
            }

            if ($locked->numeroTaquilla === null) {
                throw ValidationException::withMessages([
                    'user' => ['Este socio ya no tiene taquilla asignada.'],
                ]);
            }

            $this->liberarPlaza($locked, desasignarVip: false);

            return $locked->fresh();
        });
    }

    /**
     * Liberar la plaza desde el asignador (impago, mudanza, decisión del club):
     * aquí no hace falta aviso previo del socio y se puede retirar el VIP.
     */
    public function liberarTaquilla(User $user, bool $desasignarVip = false): LockerReleaseResultDto
    {
        return DB::transaction(function () use ($user, $desasignarVip): LockerReleaseResultDto {
            $locked = User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();
            $vipRemoved = $this->liberarPlaza($locked, $desasignarVip);

            return new LockerReleaseResultDto($locked->fresh(), $vipRemoved);
        });
    }

    /**
     * Alta en taquilla: única puerta de entrada (asignador y panel de vigencia).
     *
     * La fecha de alta no es decorativa: junto con la baja efectiva decide si la
     * siguiente cuota encadena el periodo anterior o arranca de cero.
     *
     * `$altaEl` futura reserva el número ya y deja el alta efectiva (y el periodo)
     * para ese día. Hoy o null = alta inmediata, como antes.
     */
    public function darDeAltaTaquilla(User $user, int $numero, ?Carbon $altaEl = null): User
    {
        return DB::transaction(function () use ($user, $numero, $altaEl): User {
            if (! VipVirtualLocker::allowsMultipleAssignments($numero)) {
                $ocupante = User::query()
                    ->where('numeroTaquilla', $numero)
                    ->lockForUpdate()
                    ->first();

                if ($ocupante && (int) $ocupante->id !== (int) $user->id) {
                    throw ValidationException::withMessages([
                        'numero_taquilla' => ['Esa taquilla ya está asignada a otro usuario.'],
                    ]);
                }
            }

            $locked = User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();
            // La taquilla virtual del VIP (#500) no cuenta como plaza: pasar de ella a
            // una física sí es un alta. Cambiar de número físico a otro, no.
            $yaTeniaPlaza = $locked->numeroTaquilla !== null
                && ! VipVirtualLocker::isShared($locked->numeroTaquilla);
            $locked->numeroTaquilla = $numero;

            if (! $yaTeniaPlaza) {
                $entrada = $altaEl?->copy()->startOfDay();
                $hoy = now()->startOfDay();
                if ($entrada !== null && $entrada->greaterThan($hoy)) {
                    $locked->taquilla_alta_programada_at = $entrada->toDateString();
                    $locked->taquilla_alta_at = null;
                } else {
                    $locked->taquilla_alta_at = now();
                    $locked->taquilla_alta_programada_at = null;
                }
            }

            try {
                $locked->save();
            } catch (QueryException $e) {
                if ($this->isUniquePhysicalLockerViolation($e)) {
                    throw ValidationException::withMessages([
                        'numero_taquilla' => ['Esa taquilla ya está asignada a otro usuario.'],
                    ]);
                }

                throw $e;
            }

            return $locked->fresh();
        });
    }

    /**
     * Sella el alta el día D (o el primero que se ejecute después).
     *
     * @return int filas selladas
     */
    public function applyDueScheduledAltas(): int
    {
        $hoy = now()->toDateString();
        $ids = User::query()
            ->whereNotNull('taquilla_alta_programada_at')
            ->whereDate('taquilla_alta_programada_at', '<=', $hoy)
            ->whereNotNull('numeroTaquilla')
            ->orderBy('id')
            ->pluck('id');

        $applied = 0;

        foreach ($ids as $id) {
            $did = DB::transaction(function () use ($id): bool {
                $locked = User::query()->whereKey($id)->lockForUpdate()->first();
                if ($locked === null || $locked->taquilla_alta_programada_at === null) {
                    return false;
                }

                $programada = $locked->taquilla_alta_programada_at->copy()->startOfDay();
                if ($programada->greaterThan(now()->startOfDay())) {
                    return false;
                }

                if (! $locked->hasPhysicalLocker()) {
                    $locked->taquilla_alta_programada_at = null;
                    $locked->save();

                    return false;
                }

                $locked->taquilla_alta_at = $programada->copy()->setTimeFrom(now());
                $locked->taquilla_alta_programada_at = null;
                $locked->save();

                return true;
            });

            if ($did) {
                $applied++;
            }
        }

        return $applied;
    }

    /**
     * Suelta el número y sella la baja efectiva. El socio VIP conserva la taquilla
     * virtual salvo que se le retire el VIP.
     *
     * La baja efectiva NO se limpia al volver a dar de alta: es el rastro que usa
     * `createPendingPaymentForCheckout` para no cobrarle los meses que estuvo fuera.
     *
     * @return bool si se retiró el VIP
     */
    private function liberarPlaza(User $locked, bool $desasignarVip): bool
    {
        $vipRemoved = false;
        $locked->numeroTaquilla = null;
        $locked->taquilla_baja_solicitada_at = null;
        $locked->taquilla_baja_efectiva_at = now();
        $locked->taquilla_alta_programada_at = null;

        if ($desasignarVip && (bool) $locked->is_vip) {
            $locked->is_vip = false;
            $vipRemoved = true;
        } elseif ((bool) $locked->is_vip) {
            $locked->numeroTaquilla = VipVirtualLocker::defaultNumber();
        }

        $locked->save();

        return $vipRemoved;
    }

    /**
     * El socio comunica desde la web que quiere darse de baja.
     * Solo marca la fecha del primer aviso (idempotente si ya existía).
     */
    public function marcarBajaSolicitadaPorCliente(User $user): User
    {
        return DB::transaction(function () use ($user): User {
            $locked = User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();

            if ($locked->taquilla_baja_solicitada_at === null) {
                $locked->taquilla_baja_solicitada_at = now();
                $locked->save();
            }

            return $locked->fresh();
        });
    }

    /**
     * @deprecated Prefer buildAdminPlansPayload / buildVigenciaPayload.
     *
     * @return array{planes: list<array<string, mixed>>, usuarios: list<array<string, mixed>>}
     */
    public function buildAdminDashboard(): array
    {
        return [
            'planes' => $this->buildAdminPlansPayload(),
            'usuarios' => $this->buildVigenciaPayload(),
        ];
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
        $payables = $historialPagos
            ->map(fn (PagoCuota $pago) => ['type' => PagoCuota::class, 'id' => (int) $pago->id])
            ->all();
        $receiptMap = $this->paymentReceipts->proofMetaMapForPayables($payables);
        $fiscalMap = $this->fiscalInvoices->mapForPayables($payables);

        $historialPagos = $historialPagos->map(function (PagoCuota $pago) use ($receiptMap, $fiscalMap): array {
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
                ...$this->fiscalFieldsForPago($pago, $fiscalMap),
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
                'baja_solicitada_at' => optional($user->taquilla_baja_solicitada_at)->toIso8601String(),
            ],
            'planes' => $planes,
        ];
    }

    /**
     * Cuándo empieza el periodo de la cuota nueva.
     *
     * Regla del club: el socio que no se da de baja sigue devengando cuota, así que
     * su periodo encadena al anterior aunque haya dejado meses sin pagar (esa deuda
     * es intencional, no un fallo de cálculo). El que se dio de baja —o al que el
     * club le retiró la plaza— no debe el tiempo que estuvo fuera: su periodo
     * arranca el día que vuelve a pagar.
     */
    private function resolvePeriodoInicio(User $user, ?PagoCuota $ultimoPago, Carbon $hoy): Carbon
    {
        if ($ultimoPago === null) {
            return $this->pisoPeriodoPorEntrada($user, $hoy);
        }

        $encadenado = Carbon::parse($ultimoPago->periodo_fin)->addDay()->startOfDay();

        if (! $this->coberturaRotaTrasUltimoPago($user, $ultimoPago)) {
            return $encadenado;
        }

        // Hubo baja: nunca arrancar en el pasado ni antes del día de entrada
        // programado. Si aún le queda cobertura pagada, sigue encadenando.
        $piso = $this->pisoPeriodoPorEntrada($user, $hoy);

        return $encadenado->greaterThan($piso) ? $encadenado : $piso;
    }

    /**
     * Día más temprano en el que puede empezar una cuota nueva: hoy, o el día
     * de entrada si el alta está programada a futuro.
     */
    private function pisoPeriodoPorEntrada(User $user, Carbon $hoy): Carbon
    {
        $entrada = $this->fechaEntradaAlta($user);
        if ($entrada !== null && $entrada->greaterThan($hoy)) {
            return $entrada;
        }

        return $hoy->copy();
    }

    private function fechaEntradaAlta(User $user): ?Carbon
    {
        if ($user->taquilla_alta_programada_at !== null) {
            return $user->taquilla_alta_programada_at->copy()->startOfDay();
        }

        if ($user->taquilla_alta_at !== null) {
            return $user->taquilla_alta_at->copy()->startOfDay();
        }

        return null;
    }

    /**
     * ¿Se rompió la continuidad del socio desde su último pago?
     *
     * Dos señales: una baja efectiva desde que empezó ese periodo, o un alta
     * posterior a su fin (esta segunda cubre a quien se fue antes de que se
     * registraran las bajas y vuelve ahora).
     */
    private function coberturaRotaTrasUltimoPago(User $user, PagoCuota $ultimoPago): bool
    {
        $baja = $user->taquilla_baja_efectiva_at;
        if ($baja !== null && $ultimoPago->periodo_inicio !== null
            && $baja->copy()->startOfDay()->gte(Carbon::parse($ultimoPago->periodo_inicio)->startOfDay())) {
            return true;
        }

        $alta = $this->fechaEntradaAlta($user);

        return $alta !== null && $ultimoPago->periodo_fin !== null
            && $alta->copy()->startOfDay()->gt(Carbon::parse($ultimoPago->periodo_fin)->startOfDay());
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

        // Un checkout abandonado no debe bloquear el reintento ni desplazar el
        // periodo del nuevo pago: se borra antes de calcular fechas.
        $this->purgeExpiredPendingPayments($user);

        // Un pago rechazado no da cobertura: no puede desplazar el periodo del nuevo
        // (los pendientes sí encadenan mientras su checkout viva; los caducados ya
        // se han borrado en el purge de arriba).
        $ultimoPago = PagoCuota::query()
            ->where('user_id', $user->id)
            ->whereIn('status', [PagoCuota::STATUS_PENDING, PagoCuota::STATUS_CONFIRMED])
            ->orderByDesc('periodo_fin')
            ->first();

        $now = now()->startOfDay();
        $fechaInicio = $this->resolvePeriodoInicio($user, $ultimoPago, $now);
        $fechaFin = (clone $fechaInicio)->addDays((int) $plan->duracion_dias)->subDay()->endOfDay();

        $referencia = is_string($referenciaExterna) && trim($referenciaExterna) !== ''
            ? trim($referenciaExterna)
            : $this->buildDefaultPaymentReference($user, $plan);

        return DB::transaction(function () use ($user, $plan, $planCents, $fechaInicio, $fechaFin, $referencia, $planId): PagoCuota {
            try {
                $existingPending = PagoCuota::query()
                    ->where('user_id', $user->id)
                    ->where('id_plan_pagado', $plan->id)
                    ->where('status', PagoCuota::STATUS_PENDING)
                    ->lockForUpdate()
                    ->first();

                if ($existingPending !== null) {
                    return $existingPending->loadMissing('plan');
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
                    'expires_at'              => now()->addMinutes($this->pendingUnpaidExpirationMinutes()),
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

    /** Ventana de vida de un pago pendiente antes de darlo por abandonado. */
    public function pendingUnpaidExpirationMinutes(): int
    {
        return max(1, (int) config('taquilla.pending_unpaid_expiration_minutes', 30));
    }

    /**
     * Reabre la ventana de pago: el socio vuelve a la pasarela desde un pendiente.
     */
    public function refreshPendingExpiration(PagoCuota $pago): PagoCuota
    {
        if (($pago->status ?? '') !== PagoCuota::STATUS_PENDING) {
            return $pago;
        }

        $pago->update([
            'expires_at' => now()->addMinutes($this->pendingUnpaidExpirationMinutes()),
        ]);

        return $pago;
    }

    /**
     * Borra los pagos pendientes caducados: si Stripe no confirmó, la cuota no existió.
     * Incluye pendientes sin expires_at (legado/demo) más viejos que la ventana de checkout.
     *
     * @return int Pagos eliminados
     */
    public function purgeExpiredPendingPayments(?User $user = null): int
    {
        $ttlMinutes = max(1, (int) config('taquilla.pending_unpaid_expiration_minutes', 30));
        $staleBefore = now()->subMinutes($ttlMinutes);

        return DB::transaction(function () use ($user, $staleBefore): int {
            $ids = PagoCuota::query()
                ->where('status', PagoCuota::STATUS_PENDING)
                ->where(function ($q) use ($staleBefore): void {
                    $q->where(function ($expired): void {
                        $expired->whereNotNull('expires_at')
                            ->where('expires_at', '<', now());
                    })->orWhere(function ($legacy) use ($staleBefore): void {
                        $legacy->whereNull('expires_at')
                            ->where('created_at', '<', $staleBefore);
                    });
                })
                ->when($user !== null, fn ($q) => $q->where('user_id', $user->id))
                ->pluck('id');

            $deleted = 0;
            foreach ($ids as $id) {
                $locked = PagoCuota::query()->whereKey($id)->lockForUpdate()->first();
                if ($locked === null || ! $locked->isExpiredPending()) {
                    continue;
                }

                if (PaymentWebhookIdempotency::liveCheckoutUrlFor(PagoCuota::class, (int) $locked->id) !== null) {
                    continue;
                }

                $ownerId = (int) $locked->user_id;
                $locked->delete();
                $deleted++;

                $owner = User::query()->find($ownerId);
                if ($owner !== null) {
                    $this->syncUserLockerCacheFromConfirmedPayments($owner);
                }
            }

            return $deleted;
        });
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
                    'expires_at'     => null,
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

    /**
     * Historial de pagos de cuota de taquilla + datos de vigencia/socios.
     *
     * @return array<string, mixed>
     */
    public function buildPaymentLogPayload(string $status, string $search): array
    {
        $rows = PagoCuota::query()
            ->with([
                'user:id,nombre,apellido,email,telefono,numeroTaquilla,fecha_vencimiento_cuota',
                'plan:id,nombre,duracion_dias,precio_total_cents',
            ])
            ->when($status !== 'all', fn ($q) => $q->where('status', $status))
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
            ->orderByDesc('fecha_pago')
            ->orderByDesc('created_at')
            ->limit(300)
            ->get();

        $availabilityUserIds = $rows->pluck('user_id')->unique()->values();
        $availabilityMap = $this->lockerPaymentIndex->computeAvailabilityMap($availabilityUserIds);

        return [
            'rows' => $this->enrichRegistryRowsWithReceipts($rows, $availabilityMap),
            'activePlanSummary' => $this->buildActivePlanSummaryToday(),
            'counts' => [
                'all' => (int) PagoCuota::query()->count(),
                'pending' => (int) PagoCuota::query()->where('status', PagoCuota::STATUS_PENDING)->count(),
                'confirmed' => (int) PagoCuota::query()->where('status', PagoCuota::STATUS_CONFIRMED)->count(),
                'rejected' => (int) PagoCuota::query()->where('status', PagoCuota::STATUS_REJECTED)->count(),
            ],
            'filters' => [
                'status' => $status,
                'search' => $search,
            ],
        ];
    }

    public function buildLockerOccupancyMap(): LockerOccupancyMapDto
    {
        $today = now()->startOfDay();

        $users = User::query()
            ->whereNotNull('numeroTaquilla')
            ->with([
                'pagosCuotas' => function ($q): void {
                    $q->where('status', PagoCuota::STATUS_CONFIRMED)
                        ->select('id', 'user_id', 'periodo_inicio', 'periodo_fin', 'status')
                        ->orderBy('periodo_inicio');
                },
            ])
            ->orderBy('numeroTaquilla')
            ->orderBy('id')
            ->get(['id', 'numeroTaquilla', 'nombre', 'apellido', 'email', 'telefono']);

        /** @var array<int, LockerOccupantDto> $byNumber */
        $byNumber = [];
        foreach ($users as $user) {
            $number = (int) $user->numeroTaquilla;
            if ($number <= 0 || isset($byNumber[$number])) {
                continue;
            }

            $byNumber[$number] = new LockerOccupantDto(
                number: $number,
                nombre: trim((string) ($user->nombre ?? '')),
                apellido: trim((string) ($user->apellido ?? '')),
                email: trim((string) ($user->email ?? '')),
                telefono: trim((string) ($user->telefono ?? '')),
                diasDeuda: $this->lockerDaysOverdue($user, $today),
            );
        }

        $occupants = array_values($byNumber);
        $maxOccupied = $occupants === []
            ? 0
            : max(array_map(static fn (LockerOccupantDto $o): int => $o->number, $occupants));

        return new LockerOccupancyMapDto(
            max: max(200, $maxOccupied),
            occupants: $occupants,
        );
    }

    /**
     * Días de retraso de cuota de taquilla física (0 = al día / sin mora medible).
     * Alineado con vigencia: solo rojo si hubo cobertura y ya caducó (debe días).
     */
    private function lockerDaysOverdue(User $user, Carbon $today): int
    {
        if (VipVirtualLocker::isShared($user->numeroTaquilla)) {
            return 0;
        }

        $confirmed = $user->pagosCuotas;

        $hasActiveToday = $confirmed->contains(function ($p) use ($today): bool {
            return $p->periodo_inicio && $p->periodo_fin
                && Carbon::parse($p->periodo_inicio)->startOfDay()->lte($today)
                && Carbon::parse($p->periodo_fin)->startOfDay()->gte($today);
        });

        if ($hasActiveToday) {
            return 0;
        }

        $lastStarted = $confirmed
            ->filter(fn ($p) => $p->periodo_inicio && $p->periodo_fin
                && Carbon::parse($p->periodo_inicio)->startOfDay()->lte($today))
            ->sortByDesc(fn ($p) => Carbon::parse($p->periodo_fin)->timestamp)
            ->first();

        if (! $lastStarted) {
            // Solo prepago futuro o nunca pagó → no pintar como “debe días”.
            return 0;
        }

        $fechaFin = Carbon::parse($lastStarted->periodo_fin)->startOfDay();
        if ($fechaFin->gte($today)) {
            return 0;
        }

        return max(0, (int) $fechaFin->diffInDays($today));
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
        $rows = PagoCuota::query()
            ->with('plan:id,nombre,duracion_dias')
            ->where('user_id', $user->id)
            ->orderByDesc('periodo_inicio')
            ->limit(50)
            ->get();

        $payables = $rows
            ->map(fn (PagoCuota $pago) => ['type' => PagoCuota::class, 'id' => (int) $pago->id])
            ->all();
        $receiptMap = $this->paymentReceipts->proofMetaMapForPayables($payables);
        $fiscalMap = $this->fiscalInvoices->mapForPayables($payables);

        return $rows
            ->filter(function (PagoCuota $p): bool {
                // Checkout abandonado: no mostrar (y el schedule lo borra).
                if (($p->status ?? '') === PagoCuota::STATUS_PENDING && $p->isExpiredPending()) {
                    return false;
                }

                return true;
            })
            ->map(function (PagoCuota $p) use ($receiptMap, $fiscalMap): array {
                $manualProofUrl = ! empty($p->payment_proof_path)
                    ? route('taquilla.pagos.proof', $p->id)
                    : null;
                $proof = $this->paymentReceipts->proofFieldsForPayable(
                    PagoCuota::class,
                    (int) $p->id,
                    ! empty($p->payment_proof_path),
                    $manualProofUrl,
                    $receiptMap,
                );

                return [
                    'id' => $p->id,
                    'plan' => $p->plan?->nombre ?? 'Sin plan',
                    'periodo_inicio' => optional($p->periodo_inicio)->toDateString(),
                    'periodo_fin' => optional($p->periodo_fin)->toDateString(),
                    'status' => $p->status ?? PagoCuota::STATUS_PENDING,
                    'payment_method' => $p->payment_method,
                    'is_checked' => (bool) ($p->is_checked ?? false),
                    'proof_url' => $proof['proof_url'],
                    'proof_is_stripe_receipt' => $proof['proof_is_stripe_receipt'],
                    ...$this->fiscalFieldsForPago($p, $fiscalMap),
                ];
            })
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
        $planVigente = PagoCuota::query()
            ->where('user_id', $user->id)
            ->where('status', PagoCuota::STATUS_CONFIRMED)
            ->orderByDesc('periodo_fin')
            ->orderByDesc('id')
            ->first();

        $user->update([
            'fecha_vencimiento_cuota' => $planVigente?->periodo_fin,
            'id_plan_vigente' => $planVigente?->id_plan_pagado,
        ]);
    }

    /**
     * Recalcula el caché de vigencia de todos los socios con plaza o con pagos.
     * El panel lee pagos; tienda/llave leen `fecha_vencimiento_cuota`.
     */
    public function syncAllLockerExpiryCaches(): int
    {
        $updated = 0;

        User::query()
            ->where(function ($query): void {
                $query->whereNotNull('numeroTaquilla')
                    ->orWhereHas('pagosCuotas', function ($pagos): void {
                        $pagos->where('status', PagoCuota::STATUS_CONFIRMED);
                    });
            })
            ->orderBy('id')
            ->chunkById(100, function ($users) use (&$updated): void {
                foreach ($users as $user) {
                    $this->syncUserLockerCacheFromConfirmedPayments($user);
                    $updated++;
                }
            });

        return $updated;
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
    private function enrichRegistryRowsWithReceipts(Collection $rows, array $availabilityMap = []): array
    {
        $rowsList = $rows->values();
        $resolved = PagoCuotaRegistryResource::collection($rowsList)->resolve();
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

    /**
     * @param  array<string, \App\DTOs\Invoicing\FiscalInvoicePublicDto>  $fiscalMap
     * @return array{fiscal_invoice_url: ?string, fiscal_invoice_pdf_url: ?string, fiscal_invoice_ready: bool}
     */
    private function fiscalFieldsForPago(PagoCuota $pago, array $fiscalMap): array
    {
        $fiscal = $fiscalMap[$this->fiscalInvoices->cacheKey(PagoCuota::class, (int) $pago->id)] ?? null;

        return [
            'fiscal_invoice_url' => $fiscal?->detailUrl,
            'fiscal_invoice_pdf_url' => $fiscal?->pdfUrl,
            'fiscal_invoice_ready' => $fiscal?->isReady ?? false,
        ];
    }

    private function isUniquePhysicalLockerViolation(QueryException $e): bool
    {
        $sqlState = (string) ($e->errorInfo[0] ?? '');
        $driverCode = (int) ($e->errorInfo[1] ?? 0);

        return $sqlState === '23000' && $driverCode === 1062
            && str_contains($e->getMessage(), 'users_physical_locker_unique');
    }
}
