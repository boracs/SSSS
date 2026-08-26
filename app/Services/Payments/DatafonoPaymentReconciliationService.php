<?php

declare(strict_types=1);

namespace App\Services\Payments;

use App\Actions\Photos\ConfirmPhotoBookingPaymentAction;
use App\DTOs\Payments\DatafonoHaciendaStatusDto;
use App\DTOs\Payments\TpvPaymentIngestDto;
use App\Enums\FiscalInvoiceStatus;
use App\Events\Payments\PaymentConfirmed;
use App\Models\Booking;
use App\Models\DatafonoPayment;
use App\Models\FiscalInvoice;
use App\Models\Lesson;
use App\Models\LessonUser;
use App\Models\MostradorTicket;
use App\Models\MostradorTicketLine;
use App\Models\PackBono;
use App\Models\PagoCuota;
use App\Models\PaymentTerminal;
use App\Models\Pedido;
use App\Models\PhotoSession;
use App\Models\PhotoSessionBooking;
use App\Models\PlanTaquilla;
use App\Models\Producto;
use App\Models\Surfboard;
use App\Models\User;
use App\Models\UserBono;
use App\Services\AvailabilityService;
use App\Services\BonoService;
use App\Services\BookingService;
use App\Services\Photos\PhotoBookingService;
use App\Services\Store\StoreProductPricing;
use App\Services\Taquilla\TaquillaMembershipService;
use App\Support\BusinessDateTime;
use App\Support\MoneyCents;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;
use Throwable;

/**
 * Ledger de cobros de datáfono + conciliación hacia payables de negocio.
 *
 * Fiscal:
 * - TPV con `emite_ticketbai_propio`: Hacienda la cubre el terminal; la app no dispara B2B.
 * - Efectivo (`manual_cash`): la app dispara B2B (PaymentConfirmed → TicketBAI), aunque el
 *   terminal tenga TBAI propio (el TPV no ve el metálico solo registrado en S4).
 */
final class DatafonoPaymentReconciliationService
{
    public const CATEGORIES = [
        'taquilla',
        'bono',
        'alquiler',
        'clase',
        'fotos',
        'producto',
    ];

    public function __construct(
        private readonly TaquillaMembershipService $taquilla,
        private readonly BonoService $bonos,
        private readonly ConfirmPhotoBookingPaymentAction $confirmPhoto,
        private readonly PhotoBookingService $photos,
        private readonly BookingService $bookings,
        private readonly AvailabilityService $availability,
    ) {}

    /** @return Collection<int, PaymentTerminal> */
    public function activeTerminals(): Collection
    {
        return PaymentTerminal::query()->active()->orderBy('codigo')->get();
    }

    /**
     * @param  array{
     *   payment_terminal_id: int,
     *   amount_cents: int,
     *   paid_at: string|\DateTimeInterface,
     *   external_reference?: string|null,
     *   notes?: string|null,
     *   created_by?: int|null,
     *   source?: string,
     *   raw_payload?: array<string, mixed>|null
     * }  $data
     */
    public function registerRawPayment(array $data): DatafonoPayment
    {
        return DB::transaction(function () use ($data) {
            $source = (string) ($data['source'] ?? DatafonoPayment::SOURCE_MANUAL_CASH);
            if (! in_array($source, [DatafonoPayment::SOURCE_TPV, DatafonoPayment::SOURCE_MANUAL_CASH], true)) {
                throw ValidationException::withMessages([
                    'source' => ['Origen de cobro no válido.'],
                ]);
            }

            $externalReference = isset($data['external_reference'])
                ? trim((string) $data['external_reference'])
                : '';
            $externalReference = $externalReference !== '' ? $externalReference : null;

            if ($source === DatafonoPayment::SOURCE_TPV) {
                if ($externalReference === null) {
                    throw ValidationException::withMessages([
                        'external_reference' => ['La referencia del TPV es obligatoria.'],
                    ]);
                }

                $existing = DatafonoPayment::query()
                    ->where('external_reference', $externalReference)
                    ->lockForUpdate()
                    ->first();
                if ($existing !== null) {
                    return $existing;
                }
            }

            $terminal = PaymentTerminal::query()
                ->whereKey((int) $data['payment_terminal_id'])
                ->lockForUpdate()
                ->firstOrFail();
            if (! $terminal->activo) {
                throw ValidationException::withMessages([
                    'payment_terminal_id' => ['Este datáfono está inactivo.'],
                ]);
            }

            $paidAt = $data['paid_at'] instanceof \DateTimeInterface
                ? $data['paid_at']
                : BusinessDateTime::parseInAppTimezone((string) $data['paid_at']);

            return DatafonoPayment::query()->create([
                'payment_terminal_id' => $terminal->id,
                'amount_cents' => (int) $data['amount_cents'],
                'paid_at' => $paidAt,
                'external_reference' => $externalReference,
                'status' => DatafonoPayment::STATUS_PENDING_REVIEW,
                'source' => $source,
                'notes' => $data['notes'] ?? null,
                'raw_payload' => $data['raw_payload'] ?? null,
                'created_by' => $data['created_by'] ?? null,
            ]);
        });
    }

    /**
     * Ingesta de un cobro TPV ya normalizado (webhook firmado). Idempotencia y persistencia
     * viven en registerRawPayment(); aquí solo resolvemos el terminal destino.
     */
    public function ingestTpvPayment(TpvPaymentIngestDto $dto): DatafonoPayment
    {
        $codigo = $dto->terminalCodigo ?? (string) config('services.datafono.default_terminal_codigo');

        $terminal = PaymentTerminal::query()
            ->where('codigo', $codigo)
            ->first();

        if ($terminal === null || ! $terminal->activo) {
            throw ValidationException::withMessages([
                'terminal_codigo' => ["El terminal '{$codigo}' no existe o está inactivo."],
            ]);
        }

        return $this->registerRawPayment([
            'payment_terminal_id' => $terminal->id,
            'amount_cents' => $dto->amountCents,
            'paid_at' => BusinessDateTime::parseInAppTimezone($dto->paidAt),
            'external_reference' => $dto->externalReference,
            'source' => DatafonoPayment::SOURCE_TPV,
            'notes' => $dto->notes,
            'raw_payload' => $dto->rawPayload,
            'created_by' => null,
        ]);
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function pendingCandidatesForUser(User $user, string $category): array
    {
        return match ($category) {
            'taquilla' => PagoCuota::query()
                ->with('plan:id,nombre')
                ->where('user_id', $user->id)
                ->where('status', PagoCuota::STATUS_PENDING)
                ->orderByDesc('created_at')
                ->limit(30)
                ->get()
                ->map(fn (PagoCuota $p) => [
                    'id' => $p->id,
                    'label' => ($p->plan?->nombre ?? 'Taquilla').' · '.MoneyCents::centsToEuros((int) $p->monto_pagado_cents).' €',
                    'amount_cents' => (int) $p->monto_pagado_cents,
                    'payable_type' => PagoCuota::class,
                ])->all(),
            'bono' => UserBono::query()
                ->with('pack:id,nombre,precio')
                ->where('user_id', $user->id)
                ->where('status', UserBono::STATUS_PENDING)
                ->orderByDesc('created_at')
                ->limit(30)
                ->get()
                ->map(fn (UserBono $b) => [
                    'id' => $b->id,
                    'label' => ($b->pack?->nombre ?? 'Bono').' · '.number_format((float) ($b->pack?->precio ?? 0), 2, ',', '.').' €',
                    'amount_cents' => MoneyCents::eurosToCents((float) ($b->pack?->precio ?? 0)),
                    'payable_type' => UserBono::class,
                ])->all(),
            'alquiler' => Booking::query()
                ->with('surfboard:id,name')
                ->where('user_id', $user->id)
                ->where(function ($q) {
                    $q->where('payment_status', Booking::PAYMENT_PENDING)
                        ->orWhere(function ($resto) {
                            $resto->where('payment_status', Booking::PAYMENT_CONFIRMED)
                                ->where('balance_status', Booking::BALANCE_PENDING);
                        });
                })
                ->orderByDesc('created_at')
                ->limit(30)
                ->get()
                ->map(function (Booking $b): array {
                    $guest = trim((string) ($b->client_name ?? ''));
                    // Depósito ya cobrado online: aquí solo se concilia el resto.
                    $isBalance = $b->payment_status === Booking::PAYMENT_CONFIRMED;
                    $amountCents = $isBalance
                        ? $b->remainingBalanceCents()
                        : MoneyCents::eurosToCents((float) ($b->total_price ?? 0));

                    return [
                        'id' => $b->id,
                        'label' => ($isBalance ? 'Resto · ' : '').'Alquiler '.($b->surfboard?->name ?? '#').' · '.number_format(MoneyCents::centsToEuros($amountCents), 2, ',', '.').' €'
                            .($guest !== '' ? ' · '.$guest : ''),
                        'guest_name' => $guest !== '' ? $guest : null,
                        'amount_cents' => $amountCents,
                        'payable_type' => Booking::class,
                    ];
                })->all(),
            'clase' => LessonUser::query()
                ->with('lesson:id,title,price,starts_at')
                ->where('user_id', $user->id)
                ->where(function ($q) {
                    $q->where('payment_status', LessonUser::PAYMENT_PENDING)
                        ->orWhere(function ($resto) {
                            $resto->where('payment_status', LessonUser::PAYMENT_CONFIRMED)
                                ->where('balance_status', LessonUser::BALANCE_PENDING);
                        });
                })
                ->orderByDesc('created_at')
                ->limit(30)
                ->get()
                ->map(function (LessonUser $e): array {
                    $guest = trim($e->displayName());
                    $isGuest = (bool) ($e->is_admin_guest ?? false) || trim((string) ($e->guest_first_name ?? '')) !== '';
                    // Señal ya cobrada online en la particular: aquí solo el resto.
                    $isBalance = $e->payment_status === LessonUser::PAYMENT_CONFIRMED;
                    $amountCents = $isBalance
                        ? $e->remainingBalanceCents()
                        : MoneyCents::eurosToCents((float) ($e->lesson?->price ?? 20));

                    return [
                        'id' => $e->id,
                        'label' => ($isBalance ? 'Resto · ' : '').($e->lesson?->title ?? 'Clase').' · '.number_format(MoneyCents::centsToEuros($amountCents), 2, ',', '.').' €'
                            .($isGuest && $guest !== '' ? ' · '.$guest : ''),
                        'guest_name' => $isGuest && $guest !== '' ? $guest : null,
                        'amount_cents' => $amountCents,
                        'payable_type' => LessonUser::class,
                    ];
                })->all(),
            'fotos' => PhotoSessionBooking::query()
                ->with('session:id,nombre')
                ->where('user_id', $user->id)
                ->where('payment_status', PhotoSessionBooking::PAYMENT_PENDING)
                ->orderByDesc('created_at')
                ->limit(30)
                ->get()
                ->map(function (PhotoSessionBooking $b): array {
                    $guest = trim($b->displayName());
                    $isGuest = (bool) ($b->is_admin_guest ?? false) || trim((string) ($b->guest_first_name ?? '')) !== '';

                    return [
                        'id' => $b->id,
                        'label' => ($b->session?->nombre ?? 'Fotos').' · '.MoneyCents::centsToEuros((int) $b->precio_pagado_cents).' €'
                            .($isGuest && $guest !== '' ? ' · '.$guest : ''),
                        'guest_name' => $isGuest && $guest !== '' ? $guest : null,
                        'amount_cents' => (int) $b->precio_pagado_cents,
                        'payable_type' => PhotoSessionBooking::class,
                    ];
                })->all(),
            'producto' => [],
            default => throw ValidationException::withMessages([
                'category' => ['Categoría no válida.'],
            ]),
        };
    }

    /**
     * @param  array{
     *   category: string,
     *   payable_id?: int|null,
     *   product_ids?: list<int>,
     *   photo_session_id?: int|null,
     *   fecha_inicio?: string|null,
     *   party_size?: int|null,
     *   plan_taquilla_id?: int|null,
     *   pack_bono_id?: int|null,
     *   reviewed_by?: int|null,
     *   notes?: string|null
     * }  $payload
     */
    public function reconcile(DatafonoPayment $payment, ?User $assignedUser, array $payload): DatafonoPayment
    {
        $assigned = DB::transaction(function () use ($payment, $assignedUser, $payload) {
            $locked = DatafonoPayment::query()->whereKey($payment->id)->lockForUpdate()->firstOrFail();
            if ($locked->status !== DatafonoPayment::STATUS_PENDING_REVIEW) {
                throw ValidationException::withMessages([
                    'payment' => ['Este cobro ya fue conciliado o ignorado.'],
                ]);
            }

            $category = (string) $payload['category'];
            if (! in_array($category, self::CATEGORIES, true)) {
                throw ValidationException::withMessages([
                    'category' => ['Categoría no válida.'],
                ]);
            }

            $notes = trim((string) ($payload['notes'] ?? ''));

            $payable = $this->materializePayable(
                $assignedUser,
                $locked,
                $payload,
                (int) $locked->amount_cents,
            );

            $resolvedUserId = $assignedUser?->id
                ?? (isset($payable->user_id) ? (int) $payable->user_id : null);

            $locked->update([
                'status' => DatafonoPayment::STATUS_ASSIGNED,
                'assigned_user_id' => $resolvedUserId,
                'payable_type' => $payable::class,
                'payable_id' => $payable->id,
                'notes' => $notes !== '' ? $notes : $locked->notes,
                'reviewed_by' => $payload['reviewed_by'] ?? null,
                'reviewed_at' => BusinessDateTime::now(),
            ]);

            $this->ensureSingleLineTicket(
                $locked->fresh(),
                $assignedUser,
                (string) ($payload['guest_name'] ?? ''),
                (string) ($payload['guest_email'] ?? ''),
                $category,
                $payable,
                $payload,
            );

            return $locked->fresh(['terminal', 'assignedUser', 'payable', 'ticket.lines']);
        });

        // Fuera de la TX: efectivo → B2B; TPV con TBAI propio → no (lo hace el terminal).
        $this->dispatchFiscalInvoicesForPayment($assigned);

        return $assigned;
    }

    /**
     * Admin: forzar comunicación a Hacienda (B2B) para un cobro de efectivo ya asignado.
     */
    public function communicateToHacienda(DatafonoPayment $payment): DatafonoPayment
    {
        $payment->loadMissing(['terminal', 'ticket.lines']);

        if ($payment->status !== DatafonoPayment::STATUS_ASSIGNED) {
            throw ValidationException::withMessages([
                'payment' => ['Solo se puede comunicar a Hacienda un cobro ya asignado.'],
            ]);
        }

        if ($this->isCoveredByTpvTicketBai($payment)) {
            throw ValidationException::withMessages([
                'payment' => ['Este cobro lo cubre el TicketBAI del datáfono; no hace falta comunicarlo desde la app.'],
            ]);
        }

        $targets = $this->fiscalTargetsForPayment($payment);
        if ($targets === []) {
            throw ValidationException::withMessages([
                'payment' => ['Este cobro no tiene servicio asignado para facturar.'],
            ]);
        }

        $this->dispatchFiscalInvoicesForPayment($payment);

        return $payment->fresh(['terminal', 'assignedUser', 'payable', 'ticket.lines']);
    }

    /**
     * Vía rápida desde el Gestor de Reservas: cobra en efectivo el resto de un
     * alquiler con depósito ya confirmado, dejando el mismo rastro auditable
     * (fila en el ledger de datáfono) que un cobro por TPV.
     */
    public function chargeBookingBalanceCash(Booking $booking, ?int $reviewedBy = null): Booking
    {
        if ($booking->payment_status !== Booking::PAYMENT_CONFIRMED || $booking->balance_status !== Booking::BALANCE_PENDING) {
            throw ValidationException::withMessages([
                'balance_status' => ['Esta reserva no tiene resto pendiente de cobro.'],
            ]);
        }

        $terminal = PaymentTerminal::query()->active()->orderBy('codigo')->first();
        if ($terminal === null) {
            throw ValidationException::withMessages([
                'payment_terminal_id' => ['No hay ningún datáfono activo configurado.'],
            ]);
        }

        $payment = $this->registerRawPayment([
            'payment_terminal_id' => $terminal->id,
            'amount_cents' => $booking->remainingBalanceCents(),
            'paid_at' => BusinessDateTime::now(),
            'source' => DatafonoPayment::SOURCE_MANUAL_CASH,
            'notes' => "Resto de alquiler #{$booking->id} cobrado en efectivo desde el Gestor de reservas.",
            'created_by' => $reviewedBy,
        ]);

        $this->reconcile($payment, $booking->user, [
            'category' => 'alquiler',
            'payable_id' => $booking->id,
            'reviewed_by' => $reviewedBy,
        ]);

        return $booking->fresh();
    }

    public function ignore(DatafonoPayment $payment, User $admin, ?string $notes = null): DatafonoPayment
    {
        return DB::transaction(function () use ($payment, $admin, $notes) {
            $locked = DatafonoPayment::query()->whereKey($payment->id)->lockForUpdate()->firstOrFail();
            if ($locked->status !== DatafonoPayment::STATUS_PENDING_REVIEW) {
                throw ValidationException::withMessages([
                    'payment' => ['Solo se pueden ignorar cobros pendientes de revisión.'],
                ]);
            }

            $locked->update([
                'status' => DatafonoPayment::STATUS_IGNORED,
                'notes' => $notes ?? $locked->notes,
                'reviewed_by' => $admin->id,
                'reviewed_at' => BusinessDateTime::now(),
            ]);

            return $locked->fresh(['terminal']);
        });
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function listPayments(?string $status = null, ?int $terminalId = null, int $limit = 100): array
    {
        $q = DatafonoPayment::query()
            ->with([
                'terminal:id,codigo,nombre,emite_ticketbai_propio',
                'assignedUser:id,nombre,apellido,email',
                'payable',
                'ticket.lines' => fn ($lines) => $lines
                    ->orderBy('sort')
                    ->with(['payable' => function (MorphTo $morphTo) {
                        $morphTo->morphWith([
                            PagoCuota::class => ['plan:id,nombre'],
                            UserBono::class => ['pack:id,nombre'],
                            Booking::class => ['surfboard:id,name'],
                            LessonUser::class => ['lesson:id,title,starts_at'],
                            PhotoSessionBooking::class => ['session:id,nombre'],
                            Pedido::class => ['productos:id,nombre'],
                        ]);
                    }]),
            ])
            ->orderByDesc('paid_at')
            ->limit($limit);

        if ($status) {
            $q->where('status', $status);
        }
        if ($terminalId) {
            $q->where('payment_terminal_id', $terminalId);
        }

        $payments = $q->get();
        $invoiceMap = $this->fiscalInvoiceMapForPayments($payments);

        return $payments->map(function (DatafonoPayment $p) use ($invoiceMap): array {
            $assignedName = $p->assignedUser
                ? trim("{$p->assignedUser->nombre} {$p->assignedUser->apellido}")
                : null;

            $ticketGuest = trim((string) ($p->ticket?->guest_name ?? ''));
            $guestName = $assignedName === null
                ? ($ticketGuest !== '' ? $ticketGuest : $this->guestDisplayName($p->payable))
                : null;

            $lines = ($p->ticket?->lines ?? collect())
                ->map(fn (MostradorTicketLine $line) => $this->summarizeTicketLine($line))
                ->values()
                ->all();

            if ($lines === [] && $p->payable !== null) {
                $lines = [$this->summarizeLegacyPayable($p)];
            }

            $domains = $lines !== []
                ? array_values(array_unique(array_map(
                    fn (array $l) => $l['category'],
                    $lines,
                )))
                : [];

            $hacienda = $this->resolveHaciendaStatus($p, $invoiceMap);

            return [
                'id' => $p->id,
                'terminal_id' => $p->payment_terminal_id,
                'terminal_codigo' => $p->terminal?->codigo,
                'terminal_nombre' => $p->terminal?->nombre,
                'emite_ticketbai_propio' => (bool) $p->terminal?->emite_ticketbai_propio,
                'amount_cents' => (int) $p->amount_cents,
                'amount' => MoneyCents::centsToEuros((int) $p->amount_cents),
                'paid_at' => optional($p->paid_at)?->toIso8601String(),
                'external_reference' => $p->external_reference,
                'status' => $p->status,
                'source' => $p->source,
                'assigned_user_id' => $p->assigned_user_id,
                'assigned_user_name' => $assignedName,
                'guest_name' => $guestName,
                'payable_type' => $p->payable_type,
                'payable_id' => $p->payable_id,
                'domains' => $domains,
                'ticket_lines' => $lines,
                'notes' => $p->notes,
                'hacienda' => $hacienda->toArray(),
            ];
        })->all();
    }

    /**
     * Materializa un payable de dominio para una línea del ticket.
     * `$chargeAmountCents` es el importe de esa línea (no el total del cobro).
     *
     * @param  array<string, mixed>  $payload
     */
    public function materializePayable(
        ?User $assignedUser,
        DatafonoPayment $payment,
        array $payload,
        int $chargeAmountCents
    ): Model {
        $category = (string) ($payload['category'] ?? '');
        if (! in_array($category, self::CATEGORIES, true)) {
            throw ValidationException::withMessages([
                'category' => ['Categoría no válida.'],
            ]);
        }

        return match ($category) {
            'producto' => $this->createPaidPedido(
                $assignedUser,
                $payload['product_ids'] ?? [],
                $chargeAmountCents,
                (string) ($payload['guest_name'] ?? ''),
                (string) ($payload['guest_email'] ?? ''),
            ),
            'fotos' => $this->resolveFotosPayable($assignedUser, $payload, $chargeAmountCents),
            'taquilla' => $this->resolveTaquillaPayable($assignedUser, $payload, $chargeAmountCents),
            'bono' => $this->resolveBonoPayable($assignedUser, $payload, $chargeAmountCents),
            'alquiler' => $this->resolveAlquilerPayable(
                $assignedUser,
                $payload,
                $payment,
                $chargeAmountCents,
            ),
            'clase' => $this->resolveClasePayable(
                $assignedUser,
                $payload,
                $chargeAmountCents,
            ),
            default => $this->confirmExistingPayable(
                $category,
                (int) ($payload['payable_id'] ?? 0),
                $assignedUser,
                $payment,
                $chargeAmountCents,
            ),
        };
    }

    /**
     * Dispara facturación B2B cuando corresponde (efectivo o TPV sin TBAI propio).
     */
    public function dispatchFiscalForPayment(DatafonoPayment $payment): void
    {
        $this->dispatchFiscalInvoicesForPayment($payment);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function ensureSingleLineTicket(
        DatafonoPayment $payment,
        ?User $user,
        string $guestName,
        string $guestEmail,
        string $category,
        Model $payable,
        array $payload,
    ): void {
        if ($payment->ticket()->exists()) {
            return;
        }

        $ticket = MostradorTicket::query()->create([
            'datafono_payment_id' => $payment->id,
            'user_id' => $user?->id ?? $payment->assigned_user_id,
            'guest_name' => $user === null ? (trim($guestName) ?: null) : null,
            'guest_email' => $user === null ? (trim($guestEmail) ?: null) : null,
            'total_cents' => (int) $payment->amount_cents,
            'status' => MostradorTicket::STATUS_CLOSED,
        ]);

        MostradorTicketLine::query()->create([
            'ticket_id' => $ticket->id,
            'category' => $category,
            'amount_cents' => (int) $payment->amount_cents,
            'payable_type' => $payable::class,
            'payable_id' => $payable->getKey(),
            'payload' => [
                'payable_id' => $payload['payable_id'] ?? null,
                'product_ids' => $payload['product_ids'] ?? null,
                'photo_session_id' => $payload['photo_session_id'] ?? null,
                'pack_bono_id' => $payload['pack_bono_id'] ?? null,
                'plan_taquilla_id' => $payload['plan_taquilla_id'] ?? null,
                'surfboard_id' => $payload['surfboard_id'] ?? null,
            ],
            'sort' => 0,
        ]);
    }

    /**
     * @return array{
     *     category: string,
     *     amount_cents: int,
     *     amount: float,
     *     label: string,
     *     service_at: ?string,
     *     service_until: ?string,
     *     detail: ?string,
     *     payable_type: ?string,
     *     payable_id: ?int
     * }
     */
    private function summarizeTicketLine(MostradorTicketLine $line): array
    {
        $category = (string) $line->category;
        $amountCents = (int) $line->amount_cents;
        $payload = is_array($line->payload) ? $line->payload : [];
        $payable = $line->payable;

        return $this->buildLineSummary(
            category: $category,
            amountCents: $amountCents,
            payload: $payload,
            payable: $payable instanceof Model ? $payable : null,
            payableType: $line->payable_type,
            payableId: $line->payable_id !== null ? (int) $line->payable_id : null,
        );
    }

    /**
     * Fallback 1:1 cuando el cobro aún no tiene ticket (legacy morph).
     *
     * @return array{
     *     category: string,
     *     amount_cents: int,
     *     amount: float,
     *     label: string,
     *     service_at: ?string,
     *     service_until: ?string,
     *     detail: ?string,
     *     payable_type: ?string,
     *     payable_id: ?int
     * }
     */
    private function summarizeLegacyPayable(DatafonoPayment $payment): array
    {
        $payable = $payment->payable;
        $category = match (true) {
            $payable instanceof PagoCuota => 'taquilla',
            $payable instanceof UserBono => 'bono',
            $payable instanceof Booking => 'alquiler',
            $payable instanceof LessonUser => 'clase',
            $payable instanceof PhotoSessionBooking => 'fotos',
            $payable instanceof Pedido => 'producto',
            default => 'producto',
        };

        return $this->buildLineSummary(
            category: $category,
            amountCents: (int) $payment->amount_cents,
            payload: [],
            payable: $payable instanceof Model ? $payable : null,
            payableType: $payment->payable_type,
            payableId: $payment->payable_id !== null ? (int) $payment->payable_id : null,
        );
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array{
     *     category: string,
     *     amount_cents: int,
     *     amount: float,
     *     label: string,
     *     service_at: ?string,
     *     service_until: ?string,
     *     detail: ?string,
     *     payable_type: ?string,
     *     payable_id: ?int
     * }
     */
    private function buildLineSummary(
        string $category,
        int $amountCents,
        array $payload,
        ?Model $payable,
        ?string $payableType,
        ?int $payableId,
    ): array {
        $categoryLabels = [
            'taquilla' => 'Taquilla',
            'bono' => 'Bono',
            'alquiler' => 'Alquiler',
            'clase' => 'Clase',
            'fotos' => 'Fotos',
            'producto' => 'Producto',
        ];
        $base = $categoryLabels[$category] ?? ucfirst($category);

        $label = $base;
        $serviceAt = null;
        $serviceUntil = null;
        $detail = null;

        if ($payable instanceof PagoCuota) {
            $label = $payable->plan?->nombre
                ? "Taquilla · {$payable->plan->nombre}"
                : 'Cuota taquilla';
            $serviceAt = optional($payable->periodo_inicio)?->toIso8601String();
            $serviceUntil = optional($payable->periodo_fin)?->toIso8601String();
            if ($serviceAt && $serviceUntil) {
                $detail = 'Periodo de cuota';
            }
        } elseif ($payable instanceof UserBono) {
            $packName = $payable->pack?->nombre;
            $label = $packName ? "Bono · {$packName}" : 'Bono';
            $restantes = $payable->clases_restantes;
            if ($restantes !== null) {
                $detail = "{$restantes} clases restantes";
            }
        } elseif ($payable instanceof Booking) {
            $board = $payable->surfboard?->name;
            $label = $board ? "Alquiler · {$board}" : 'Alquiler';
            $serviceAt = optional($payable->pickup_at ?? $payable->start_date)?->toIso8601String();
            $serviceUntil = optional($payable->end_date ?? null)?->toIso8601String();
        } elseif ($payable instanceof LessonUser) {
            $title = $payable->lesson?->title;
            $label = $title ? "Clase · {$title}" : 'Clase';
            $serviceAt = optional($payable->lesson?->starts_at)?->toIso8601String();
        } elseif ($payable instanceof PhotoSessionBooking) {
            $sessionName = $payable->session?->nombre;
            $label = $sessionName ? "Fotos · {$sessionName}" : 'Fotos';
            $serviceAt = optional($payable->fecha_inicio)?->toIso8601String();
            $serviceUntil = optional($payable->fecha_fin)?->toIso8601String();
            if ((int) ($payable->party_size ?? 0) > 0) {
                $detail = (int) $payable->party_size.' pers.';
            }
        } elseif ($payable instanceof Pedido) {
            $names = $payable->relationLoaded('productos')
                ? $payable->productos->pluck('nombre')->filter()->values()->all()
                : [];
            if ($names !== []) {
                $shown = array_slice($names, 0, 3);
                $label = 'Producto · '.implode(', ', $shown).(count($names) > 3 ? '…' : '');
            } else {
                $label = 'Producto';
            }
        } else {
            if ($category === 'fotos' && ! empty($payload['fecha_inicio'])) {
                $serviceAt = $this->isoOrNull($payload['fecha_inicio']);
            }
            if ($category === 'alquiler' && ! empty($payload['rental_pickup_at'])) {
                $serviceAt = $this->isoOrNull($payload['rental_pickup_at']);
            }
            if ($category === 'taquilla' && ! empty($payload['fecha_inicio'])) {
                $serviceAt = $this->isoOrNull($payload['fecha_inicio']);
            }
            if ($category === 'fotos' && ! empty($payload['party_size'])) {
                $detail = ((int) $payload['party_size']).' pers.';
            }
        }

        return [
            'category' => $category,
            'amount_cents' => $amountCents,
            'amount' => MoneyCents::centsToEuros($amountCents),
            'label' => $label,
            'service_at' => $serviceAt,
            'service_until' => $serviceUntil,
            'detail' => $detail,
            'payable_type' => $payableType,
            'payable_id' => $payableId,
        ];
    }

    private function isoOrNull(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        try {
            return BusinessDateTime::parseInAppTimezone((string) $value)->toIso8601String();
        } catch (Throwable) {
            return is_string($value) ? $value : null;
        }
    }

    private function guestDisplayName(?Model $payable): ?string
    {
        if ($payable === null) {
            return null;
        }

        $name = match (true) {
            $payable instanceof Pedido => $payable->displayName(),
            $payable instanceof PhotoSessionBooking => $payable->displayName(),
            $payable instanceof LessonUser => $payable->displayName(),
            $payable instanceof Booking => $payable->displayName(),
            default => '',
        };

        $name = trim((string) $name);

        return $name !== '' ? $name : null;
    }

    /**
     * @return list<array{id: int, nombre: string, precio_cents: int, precio: float, duracion_dias: int}>
     */
    public function catalogPlanesTaquilla(): array
    {
        return PlanTaquilla::query()
            ->where('activo', true)
            ->orderBy('nombre')
            ->get(['id', 'nombre', 'precio_total_cents', 'duracion_dias'])
            ->map(fn (PlanTaquilla $p) => [
                'id' => (int) $p->id,
                'nombre' => (string) $p->nombre,
                'precio_cents' => (int) $p->precio_total_cents,
                'precio' => MoneyCents::centsToEuros((int) $p->precio_total_cents),
                'duracion_dias' => (int) $p->duracion_dias,
            ])
            ->values()
            ->all();
    }

    /**
     * @return list<array{id: int, nombre: string, precio_cents: int, precio: float, num_clases: int}>
     */
    public function catalogPacksBono(): array
    {
        return PackBono::query()
            ->where('activo', true)
            ->orderBy('nombre')
            ->get(['id', 'nombre', 'precio', 'num_clases'])
            ->map(fn (PackBono $p) => [
                'id' => (int) $p->id,
                'nombre' => (string) $p->nombre,
                'precio_cents' => MoneyCents::eurosToCents((float) $p->precio),
                'precio' => (float) $p->precio,
                'num_clases' => (int) $p->num_clases,
            ])
            ->values()
            ->all();
    }

    /**
     * Clases programadas próximas para reserva walk-in en el ticket de mostrador.
     *
     * @return list<array{
     *     id: int,
     *     title: string,
     *     type: string,
     *     modality: string,
     *     level: string,
     *     starts_at: string,
     *     ends_at: string,
     *     price: float,
     *     precio_cents: int,
     *     max_slots: int,
     *     seats_taken: int,
     *     label: string
     * }>
     */
    public function catalogUpcomingLessons(int $daysAhead = 21, int $limit = 100): array
    {
        $now = BusinessDateTime::now();
        $until = $now->copy()->addDays(max(1, $daysAhead));
        $seatStatuses = [
            LessonUser::STATUS_PENDING,
            LessonUser::STATUS_PENDING_EXTRA_MONITOR,
            LessonUser::STATUS_CONFIRMED,
            LessonUser::STATUS_ENROLLED,
            LessonUser::STATUS_ATTENDED,
        ];

        return Lesson::query()
            ->where('status', Lesson::STATUS_SCHEDULED)
            ->where('starts_at', '>', $now)
            ->where('starts_at', '<=', $until)
            ->withCount([
                'enrollments as seats_taken' => fn ($q) => $q->whereIn('status', $seatStatuses),
            ])
            ->orderBy('starts_at')
            ->limit($limit)
            ->get([
                'id', 'title', 'type', 'modality', 'level', 'is_private',
                'starts_at', 'ends_at', 'price', 'max_slots', 'max_capacity',
            ])
            ->map(fn (Lesson $l): array => $this->mapLessonCatalogItem($l))
            ->values()
            ->all();
    }

    /**
     * Crea una clase programada desde el ticket de mostrador (walk-in).
     * Solo particular/grupal (semanal → Commander).
     *
     * @param  array{
     *     starts_at: string,
     *     duration_minutes?: int,
     *     type?: string,
     *     modality?: string,
     *     level?: string,
     *     price?: float|int|string,
     *     max_slots?: int
     * }  $data
     * @return array<string, mixed>
     */
    public function createWalkInLesson(array $data): array
    {
        $modality = (string) ($data['modality'] ?? Lesson::MODALITY_PARTICULAR);
        if (! in_array($modality, [Lesson::MODALITY_PARTICULAR, Lesson::MODALITY_GRUPAL], true)) {
            throw ValidationException::withMessages([
                'modality' => ['Desde el ticket solo puedes crear particular o grupal. El semanal va en Commander.'],
            ]);
        }

        $type = (string) ($data['type'] ?? Lesson::TYPE_SURF);
        if (! in_array($type, [Lesson::TYPE_SURF, Lesson::TYPE_SKATE], true)) {
            throw ValidationException::withMessages([
                'type' => ['Tipo no válido (surf o skate).'],
            ]);
        }

        $level = (string) ($data['level'] ?? Lesson::LEVEL_INICIACION);
        if (! in_array($level, [
            Lesson::LEVEL_INICIACION,
            Lesson::LEVEL_INTERMEDIO,
            Lesson::LEVEL_AVANZADO,
        ], true)) {
            throw ValidationException::withMessages([
                'level' => ['Nivel no válido.'],
            ]);
        }

        $duration = (int) ($data['duration_minutes'] ?? 90);
        if (! in_array($duration, [60, 90], true)) {
            throw ValidationException::withMessages([
                'duration_minutes' => ['La duración debe ser 60 o 90 minutos.'],
            ]);
        }

        $startsRaw = trim((string) ($data['starts_at'] ?? ''));
        if ($startsRaw === '') {
            throw ValidationException::withMessages([
                'starts_at' => ['Indica fecha y hora de inicio.'],
            ]);
        }

        try {
            $startsAt = BusinessDateTime::parseInAppTimezone($startsRaw);
        } catch (Throwable) {
            throw ValidationException::withMessages([
                'starts_at' => ['Fecha/hora de inicio no válida.'],
            ]);
        }

        if ((int) $startsAt->minute % 15 !== 0 || (int) $startsAt->second !== 0) {
            // Normalizar segundos; exigir cuarto de hora en minutos.
            $startsAt = $startsAt->copy()->second(0);
            if ((int) $startsAt->minute % 15 !== 0) {
                throw ValidationException::withMessages([
                    'starts_at' => ['Las horas deben estar en intervalos de 15 minutos (:00, :15, :30, :45).'],
                ]);
            }
        } else {
            $startsAt = $startsAt->copy()->second(0);
        }

        if ($startsAt->lte(BusinessDateTime::now())) {
            throw ValidationException::withMessages([
                'starts_at' => ['La clase debe ser en el futuro.'],
            ]);
        }

        $endsAt = $startsAt->copy()->addMinutes($duration);
        $maxSlots = $modality === Lesson::MODALITY_PARTICULAR
            ? 1
            : max(1, min(12, (int) ($data['max_slots'] ?? 6)));

        $price = (float) ($data['price'] ?? ($modality === Lesson::MODALITY_PARTICULAR ? 55 : 35));
        if ($price <= 0) {
            throw ValidationException::withMessages([
                'price' => ['Indica un precio válido (> 0).'],
            ]);
        }

        $projectedPartySize = $maxSlots >= 7 ? 7 : 1;
        $availability = $this->availability->preview($startsAt, $endsAt, $projectedPartySize);
        if (! $availability['allowed']) {
            throw ValidationException::withMessages([
                'starts_at' => [$this->availability->buildConflictMessage($availability)],
            ]);
        }

        $titleModality = $modality === Lesson::MODALITY_PARTICULAR ? 'Particular' : 'Grupal';
        $title = sprintf(
            '%s · %s · %s',
            $titleModality,
            strtoupper($type),
            $startsAt->format('d/m/Y H:i'),
        );

        $lesson = Lesson::query()->create([
            'title' => $title,
            'starts_at' => $startsAt,
            'ends_at' => $endsAt,
            'type' => $type,
            'modality' => $modality,
            'level' => $level,
            'max_slots' => $maxSlots,
            'price' => $price,
            'status' => Lesson::STATUS_SCHEDULED,
            'is_private' => $modality === Lesson::MODALITY_PARTICULAR,
            'location' => 'Zurriola',
            'internal_notes' => '[datafono_walkin_lesson]',
        ]);

        return $this->mapLessonCatalogItem($lesson->fresh());
    }

    /**
     * @return array{
     *     id: int,
     *     title: string,
     *     type: string,
     *     modality: string,
     *     level: string,
     *     starts_at: string,
     *     ends_at: string,
     *     price: float,
     *     precio_cents: int,
     *     max_slots: int,
     *     seats_taken: int,
     *     label: string
     * }
     */
    public function mapLessonCatalogItem(Lesson $l): array
    {
        $modality = (string) ($l->modality ?: ($l->is_private
            ? Lesson::MODALITY_PARTICULAR
            : Lesson::MODALITY_GRUPAL));
        $type = (string) ($l->type ?: Lesson::TYPE_SURF);
        $price = (float) ($l->price ?? 20);
        $precioCents = MoneyCents::eurosToCents($price);
        $startsLabel = $l->starts_at
            ? $l->starts_at->locale('es')->translatedFormat('D d/m H:i')
            : '';
        $title = trim((string) ($l->title ?: 'Clase'));
        $maxSlots = (int) ($l->max_slots ?? $l->max_capacity ?? 6);
        $taken = (int) ($l->seats_taken ?? 0);

        return [
            'id' => (int) $l->id,
            'title' => $title,
            'type' => $type,
            'modality' => $modality,
            'level' => (string) ($l->level ?: Lesson::LEVEL_INICIACION),
            'starts_at' => optional($l->starts_at)?->toIso8601String() ?? '',
            'ends_at' => optional($l->ends_at)?->toIso8601String() ?? '',
            'price' => $price,
            'precio_cents' => $precioCents,
            'max_slots' => $maxSlots,
            'seats_taken' => $taken,
            'label' => trim(sprintf(
                '%s · %s · %s · %s € (%d/%d)',
                $startsLabel,
                strtoupper($type),
                $modality,
                number_format($price, 2, ',', '.'),
                $taken,
                $maxSlots,
            )),
        ];
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function resolveTaquillaPayable(
        ?User $user,
        array $payload,
        int $chargeAmountCents
    ): PagoCuota {
        $payableId = (int) ($payload['payable_id'] ?? 0);
        if ($payableId > 0) {
            return $this->confirmExistingPayable('taquilla', $payableId, $user, null, $chargeAmountCents);
        }

        $planId = (int) ($payload['plan_taquilla_id'] ?? 0);
        if ($planId <= 0) {
            throw ValidationException::withMessages([
                'plan_taquilla_id' => ['Elige un pago pendiente o un plan de taquilla nuevo.'],
            ]);
        }
        if ($user === null) {
            throw ValidationException::withMessages([
                'user_id' => ['Asigna un socio para crear un pago de taquilla nuevo.'],
            ]);
        }
        if (! $user->hasActiveLocker()) {
            throw ValidationException::withMessages([
                'category' => ['Solo se puede cobrar cuota de taquilla a un socio que ya tiene taquilla asignada.'],
            ]);
        }

        $pago = $this->taquilla->createPendingPaymentForCheckout(
            $user,
            $planId,
            'datafono-line-'.uniqid('', true),
        );

        $this->assertAmountMatchesCents($chargeAmountCents, $pago);
        $this->assertNotAlreadyLinked($pago);

        return $this->confirmPagoCuota($pago);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function resolveBonoPayable(
        ?User $user,
        array $payload,
        int $chargeAmountCents
    ): UserBono {
        $payableId = (int) ($payload['payable_id'] ?? 0);
        if ($payableId > 0) {
            return $this->confirmExistingPayable('bono', $payableId, $user, null, $chargeAmountCents);
        }

        $packId = (int) ($payload['pack_bono_id'] ?? 0);
        if ($packId <= 0) {
            throw ValidationException::withMessages([
                'pack_bono_id' => ['Elige un bono pendiente o un pack nuevo.'],
            ]);
        }
        if ($user === null) {
            throw ValidationException::withMessages([
                'user_id' => ['Asigna un socio para crear un bono nuevo.'],
            ]);
        }
        if (! $user->canAccessAuctions()) {
            throw ValidationException::withMessages([
                'user_id' => ['Solo un socio VIP (o con taquilla) puede comprar un bono.'],
            ]);
        }

        $pack = PackBono::query()->whereKey($packId)->lockForUpdate()->firstOrFail();
        if (! (bool) $pack->activo) {
            throw ValidationException::withMessages([
                'pack_bono_id' => ['Este pack de bono está inactivo.'],
            ]);
        }

        $bono = $this->bonos->requestBono($user, $pack)->load('pack');
        $this->assertAmountMatchesCents($chargeAmountCents, $bono);
        $this->assertNotAlreadyLinked($bono);

        return $this->confirmBono($bono);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function resolveAlquilerPayable(
        ?User $user,
        array $payload,
        DatafonoPayment $payment,
        int $chargeAmountCents
    ): Booking {
        $payableId = (int) ($payload['payable_id'] ?? 0);
        if ($payableId > 0) {
            return $this->confirmExistingPayable('alquiler', $payableId, $user, $payment, $chargeAmountCents);
        }

        // Walk-in: cliente sin reserva previa llega al mostrador y se le cobra
        // el 100 % en el momento (sin concepto de depósito).
        $surfboardId = (int) ($payload['surfboard_id'] ?? 0);
        if ($surfboardId <= 0) {
            throw ValidationException::withMessages([
                'surfboard_id' => ['Elige un alquiler pendiente o selecciona una tabla para la reserva nueva.'],
            ]);
        }

        $guestName = trim((string) ($payload['guest_name'] ?? ''));
        if ($user === null && $guestName === '') {
            throw ValidationException::withMessages([
                'user_id' => ['Asigna un socio o indica el nombre del cliente para la reserva nueva.'],
            ]);
        }

        $pickupRaw = trim((string) ($payload['rental_pickup_at'] ?? ''));
        if ($pickupRaw === '') {
            throw ValidationException::withMessages([
                'rental_pickup_at' => ['Indica la fecha/hora de recogida.'],
            ]);
        }

        $surfboard = Surfboard::query()->with('priceSchema')->whereKey($surfboardId)->lockForUpdate()->firstOrFail();
        if (! $surfboard->is_active) {
            throw ValidationException::withMessages([
                'surfboard_id' => ['Esta tabla está retirada del alquiler.'],
            ]);
        }

        $schema = $surfboard->priceSchema;
        if ($schema === null) {
            throw ValidationException::withMessages([
                'surfboard_id' => ['La tabla no tiene esquema de precios configurado.'],
            ]);
        }

        $mode = (string) ($payload['rental_mode'] ?? 'hour');

        try {
            if ($mode === 'day') {
                $days = (int) ($payload['rental_pack_days'] ?? 0);
                if ($days <= 0) {
                    throw new InvalidArgumentException('Indica los días de alquiler.');
                }
                $window = $this->bookings->normalizeDayRange(BusinessDateTime::parseRentalDate($pickupRaw), $days);
            } else {
                $packMinutes = (int) ($payload['rental_pack_minutes'] ?? 0);
                if ($packMinutes <= 0) {
                    throw new InvalidArgumentException('Elige el pack de horas.');
                }
                $window = $this->bookings->normalizeHourWindow(BusinessDateTime::parseInAppTimezone($pickupRaw), $packMinutes);
            }
        } catch (InvalidArgumentException $e) {
            throw ValidationException::withMessages([
                'rental_pickup_at' => [$e->getMessage()],
            ]);
        }

        if (! $this->bookings->isWindowAvailable((int) $surfboard->id, $window)) {
            throw ValidationException::withMessages([
                'surfboard_id' => ['La tabla no está disponible en ese rango.'],
            ]);
        }

        $pricing = $this->bookings->resolvePricingForWindow($schema, $window, 100.0);
        $quotedCents = MoneyCents::eurosToCents($pricing['total_price']);
        $paymentCents = $chargeAmountCents;

        if ($quotedCents !== $paymentCents) {
            $expectedEuros = number_format(MoneyCents::centsToEuros($quotedCents), 2, ',', '.');
            $actualEuros = number_format(MoneyCents::centsToEuros($paymentCents), 2, ',', '.');
            throw ValidationException::withMessages([
                'amount_cents' => [
                    "Importe línea ({$actualEuros} €) ≠ tarifa calculada ({$expectedEuros} €).",
                ],
            ]);
        }

        $totalEuros = $pricing['total_price'];

        $clientName = $user !== null ? trim("{$user->nombre} {$user->apellido}") : $guestName;
        $guestEmail = trim((string) ($payload['guest_email'] ?? ''));

        $booking = Booking::query()->create([
            'surfboard_id' => $surfboard->id,
            'user_id' => $user?->id,
            'client_name' => $clientName !== '' ? $clientName : 'Cliente mostrador',
            'client_email' => $user?->email ?? ($guestEmail !== '' ? $guestEmail : null),
            'client_phone' => $user?->telefono,
            'mode' => $window->mode,
            'start_date' => $window->pickupAt,
            'end_date' => $window->returnAt,
            'pickup_at' => $window->pickupAt,
            'return_at' => $window->returnAt,
            'block_end' => $window->blockEnd,
            'pack_minutes' => $window->packMinutes,
            'pack_days' => $window->packDays,
            'status' => Booking::STATUS_CONFIRMED,
            'payment_status' => Booking::PAYMENT_CONFIRMED,
            'balance_status' => Booking::BALANCE_NONE,
            'payment_method' => 'datafono',
            'total_price' => $totalEuros,
            'deposit_amount' => $totalEuros,
            'reviewed_at' => BusinessDateTime::now(),
        ]);

        return $booking->fresh();
    }

    private function confirmExistingPayable(
        string $category,
        int $payableId,
        ?User $user,
        ?DatafonoPayment $payment,
        int $chargeAmountCents
    ): Model {
        if ($payableId <= 0) {
            throw ValidationException::withMessages([
                'payable_id' => ['Selecciona el pago pendiente a conciliar.'],
            ]);
        }

        $payable = match ($category) {
            'taquilla' => PagoCuota::query()->whereKey($payableId)->lockForUpdate()->firstOrFail(),
            'bono' => UserBono::query()->with('pack')->whereKey($payableId)->lockForUpdate()->firstOrFail(),
            'alquiler' => Booking::query()->whereKey($payableId)->lockForUpdate()->firstOrFail(),
            'clase' => LessonUser::query()->with('lesson')->whereKey($payableId)->lockForUpdate()->firstOrFail(),
            default => throw ValidationException::withMessages([
                'category' => ['Categoría no soportada para payable existente.'],
            ]),
        };

        $this->assertOwnership($payable, $user);
        $this->assertPayablePending($payable);
        $this->assertNotAlreadyLinked($payable);
        $this->assertAmountMatchesCents($chargeAmountCents, $payable);

        return match ($category) {
            'taquilla' => $this->confirmPagoCuota($payable),
            'bono' => $this->confirmBono($payable),
            'alquiler' => $this->confirmBooking($payable, $payment?->source),
            'clase' => $this->confirmLesson($payable, $payment?->source),
            default => throw ValidationException::withMessages([
                'category' => ['Categoría no soportada para payable existente.'],
            ]),
        };
    }

    private function confirmPagoCuota(PagoCuota $pago): PagoCuota
    {
        $ok = $this->taquilla->confirmPaymentFromGateway((int) $pago->id);
        if (! $ok) {
            throw ValidationException::withMessages([
                'payable_id' => ['No se pudo confirmar el pago de taquilla.'],
            ]);
        }

        $pago->refresh();
        $pago->update(['payment_method' => 'datafono']);

        return $pago->fresh();
    }

    private function confirmBono(UserBono $bono): UserBono
    {
        $this->bonos->confirmBono((int) $bono->id);

        return $bono->fresh();
    }

    /**
     * Bifurca según lo que se está cobrando: si ya había depósito confirmado
     * y resto pendiente, esto es el cobro del RESTO (no toca payment_status,
     * que ya estaba confirmed); si no, es el depósito/importe íntegro de
     * siempre. `$source` distingue TPV vs efectivo para el resto.
     */
    private function confirmBooking(Booking $booking, ?string $source = null): Booking
    {
        if ($booking->payment_status === Booking::PAYMENT_CONFIRMED && $booking->balance_status === Booking::BALANCE_PENDING) {
            $booking->update([
                'balance_status' => Booking::BALANCE_CONFIRMED,
                'balance_payment_method' => $source === DatafonoPayment::SOURCE_MANUAL_CASH ? 'efectivo' : 'datafono',
                'balance_paid_at' => BusinessDateTime::now(),
            ]);

            return $booking->fresh();
        }

        $booking->update([
            'payment_status' => Booking::PAYMENT_CONFIRMED,
            'status' => Booking::STATUS_CONFIRMED,
            'payment_method' => 'datafono',
            'reviewed_at' => BusinessDateTime::now(),
            // El mostrador cobra el importe íntegro exigido por expectedAmountCents()
            // en esta rama (no una señal): no queda resto pendiente.
            'deposit_amount' => $booking->total_price,
            'balance_status' => Booking::BALANCE_NONE,
        ]);

        return $booking->fresh();
    }

    /**
     * Misma bifurcación que el alquiler: si la particular ya tiene la señal
     * online confirmada y resto pendiente, esto cobra el RESTO; si no, es el
     * importe íntegro de la clase.
     */
    private function confirmLesson(LessonUser $enrollment, ?string $source = null): LessonUser
    {
        if ($enrollment->payment_status === LessonUser::PAYMENT_CONFIRMED && $enrollment->balance_status === LessonUser::BALANCE_PENDING) {
            $enrollment->update([
                'balance_status' => LessonUser::BALANCE_CONFIRMED,
                'balance_payment_method' => $source === DatafonoPayment::SOURCE_MANUAL_CASH ? 'efectivo' : 'datafono',
                'balance_paid_at' => BusinessDateTime::now(),
            ]);

            return $enrollment->fresh();
        }

        $enrollment->update([
            'payment_status' => LessonUser::PAYMENT_CONFIRMED,
            'status' => LessonUser::STATUS_CONFIRMED,
            'payment_method' => 'datafono',
            'confirmed_at' => BusinessDateTime::now(),
            'reviewed_at' => BusinessDateTime::now(),
            // El mostrador cobra aquí el importe íntegro: no queda resto.
            'deposit_amount_cents' => $enrollment->totalPriceCents(),
            'balance_status' => LessonUser::BALANCE_NONE,
        ]);

        return $enrollment->fresh();
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function resolveClasePayable(
        ?User $user,
        array $payload,
        int $chargeAmountCents
    ): LessonUser {
        $payableId = (int) ($payload['payable_id'] ?? 0);
        if ($payableId > 0) {
            return $this->confirmExistingPayable(
                'clase',
                $payableId,
                $user,
                null,
                $chargeAmountCents
            );
        }

        $lessonId = (int) ($payload['lesson_id'] ?? 0);
        if ($lessonId <= 0) {
            throw ValidationException::withMessages([
                'lesson_id' => ['Elige una clase pendiente o selecciona una clase del calendario para reservar.'],
            ]);
        }

        $guestName = trim((string) ($payload['guest_name'] ?? ''));
        $guestEmail = trim((string) ($payload['guest_email'] ?? ''));
        if ($user === null && $guestName === '') {
            throw ValidationException::withMessages([
                'user_id' => ['Asigna un socio o indica el nombre del cliente para reservar la clase.'],
            ]);
        }

        return $this->availability->withLockedLesson($lessonId, function (Lesson $locked) use (
            $user,
            $guestName,
            $guestEmail,
            $chargeAmountCents
        ): LessonUser {
            if ($locked->status !== Lesson::STATUS_SCHEDULED) {
                throw ValidationException::withMessages([
                    'lesson_id' => ['Esta clase no admite nuevas reservas.'],
                ]);
            }
            if (! $locked->starts_at || ! $locked->ends_at) {
                throw ValidationException::withMessages([
                    'lesson_id' => ['La clase no tiene horario válido.'],
                ]);
            }
            if ($locked->starts_at->lt(BusinessDateTime::now())) {
                throw ValidationException::withMessages([
                    'lesson_id' => ['Esta clase ya ha pasado.'],
                ]);
            }

            $activeStatuses = [
                LessonUser::STATUS_PENDING,
                LessonUser::STATUS_PENDING_EXTRA_MONITOR,
                LessonUser::STATUS_CONFIRMED,
                LessonUser::STATUS_ENROLLED,
                LessonUser::STATUS_ATTENDED,
            ];

            if ($user !== null) {
                $already = LessonUser::query()
                    ->where('lesson_id', $locked->id)
                    ->where('user_id', $user->id)
                    ->whereIn('status', $activeStatuses)
                    ->exists();
                if ($already) {
                    throw ValidationException::withMessages([
                        'lesson_id' => ['Este socio ya tiene una plaza activa en esa clase.'],
                    ]);
                }
            }

            $blockingStatuses = $this->availability->occupancyStatuses();
            $seatsTaken = (int) LessonUser::query()
                ->where('lesson_id', $locked->id)
                ->whereIn('status', $blockingStatuses)
                ->sum(DB::raw('COALESCE(quantity, party_size, 1)'));

            $partySize = 1;
            $maxSlots = (int) ($locked->max_slots ?? $locked->max_capacity ?? 6);
            if ($maxSlots > 0 && $seatsTaken + $partySize > $maxSlots) {
                throw ValidationException::withMessages([
                    'lesson_id' => ["No hay plazas libres en esta clase ({$seatsTaken}/{$maxSlots})."],
                ]);
            }

            $evaluation = $this->availability->evaluate(
                $locked->starts_at,
                $locked->ends_at,
                $seatsTaken + $partySize,
                (int) $locked->id,
            );
            if (! $evaluation['allowed']) {
                throw ValidationException::withMessages([
                    'lesson_id' => [$this->availability->buildConflictMessage($evaluation)],
                ]);
            }

            $expectedCents = MoneyCents::eurosToCents((float) ($locked->price ?? 20));
            if ($chargeAmountCents !== $expectedCents) {
                throw ValidationException::withMessages([
                    'amount_cents' => [
                        'El importe de la línea ('.number_format($chargeAmountCents / 100, 2, ',', '.').' €) no coincide con el precio de la clase ('.number_format($expectedCents / 100, 2, ',', '.').' €).',
                    ],
                ]);
            }

            $nameParts = preg_split('/\s+/', $guestName, 2) ?: [];
            $guestFirst = trim((string) ($nameParts[0] ?? ''));
            $guestLast = trim((string) ($nameParts[1] ?? ''));

            return LessonUser::query()->create([
                'lesson_id' => (int) $locked->id,
                'user_id' => $user?->id,
                'is_admin_guest' => $user === null,
                'guest_first_name' => $user === null ? ($guestFirst !== '' ? $guestFirst : 'Cliente') : null,
                'guest_last_name' => $user === null ? ($guestLast !== '' ? $guestLast : 'mostrador') : null,
                'guest_email' => $user === null && $guestEmail !== '' ? $guestEmail : null,
                'party_size' => 1,
                'quantity' => 1,
                'status' => LessonUser::STATUS_CONFIRMED,
                'payment_status' => LessonUser::PAYMENT_CONFIRMED,
                'payment_method' => 'datafono',
                'confirmed_at' => BusinessDateTime::now(),
                'reviewed_at' => BusinessDateTime::now(),
                'admin_notes' => '[datafono_walkin]',
            ]);
        });
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function resolveFotosPayable(
        ?User $user,
        array $payload,
        int $chargeAmountCents
    ): PhotoSessionBooking {
        $payableId = (int) ($payload['payable_id'] ?? 0);
        if ($payableId > 0) {
            $booking = PhotoSessionBooking::query()->whereKey($payableId)->lockForUpdate()->firstOrFail();
            $this->assertOwnership($booking, $user, allowAnonymousWithoutUser: true);
            $this->assertPayablePending($booking);
            $this->assertNotAlreadyLinked($booking);
            $this->assertAmountMatchesCents($chargeAmountCents, $booking);
            $this->confirmPhoto->execute($booking, 'datafono');

            return $booking->fresh();
        }

        // Nueva reserva: precio = base + (personas × plus). Cobro debe coincidir con catálogo.
        $sessionId = (int) ($payload['photo_session_id'] ?? 0);
        if ($sessionId <= 0 || empty($payload['fecha_inicio'])) {
            throw ValidationException::withMessages([
                'photo_session_id' => ['Elige un pack de fotos pendiente o crea uno nuevo con fecha.'],
            ]);
        }

        $guestName = trim((string) ($payload['guest_name'] ?? ''));
        if ($user === null && $guestName === '') {
            throw ValidationException::withMessages([
                'user_id' => ['Asigna un socio o indica el nombre del cliente no registrado.'],
            ]);
        }
        [$guestFirstName, $guestLastName] = self::splitGuestName($guestName);

        $partySize = max(1, (int) ($payload['party_size'] ?? 1));
        $session = PhotoSession::query()->whereKey($sessionId)->firstOrFail();
        $quotedCents = $this->photos->quotePriceCents($session, $partySize);
        $paymentCents = $chargeAmountCents;

        if ($quotedCents !== $paymentCents) {
            $expectedEuros = number_format(MoneyCents::centsToEuros($quotedCents), 2, ',', '.');
            $actualEuros = number_format(MoneyCents::centsToEuros($paymentCents), 2, ',', '.');
            throw ValidationException::withMessages([
                'amount_cents' => [
                    "Importe línea ({$actualEuros} €) ≠ catálogo base+plus ({$expectedEuros} €).",
                ],
            ]);
        }

        $booking = $this->photos->createBooking([
            'photo_session_id' => $sessionId,
            'fecha_inicio' => $payload['fecha_inicio'],
            'party_size' => $partySize,
            'user_id' => $user?->id,
            'guest_first_name' => $user?->nombre ?? $guestFirstName,
            'guest_last_name' => $user?->apellido ?? $guestLastName,
            'guest_email' => $user?->email ?? (trim((string) ($payload['guest_email'] ?? '')) ?: null),
            'guest_phone' => $user?->telefono,
            'is_admin_guest' => $user === null,
            'precio_pagado_cents' => null,
            'payment_method' => 'datafono',
        ]);

        $this->confirmPhoto->execute($booking, 'datafono');

        return $booking->fresh();
    }

    /**
     * @param  list<int>  $productIds
     */
    private function createPaidPedido(
        ?User $user,
        array $productIds,
        int $chargeAmountCents,
        string $guestName = '',
        string $guestEmail = '',
    ): Pedido {
        $guestName = trim($guestName);
        if ($user === null && $guestName === '') {
            throw ValidationException::withMessages([
                'user_id' => ['Asigna un socio o indica el nombre del cliente no registrado.'],
            ]);
        }

        $ids = array_values(array_unique(array_map('intval', $productIds)));
        sort($ids);
        if ($ids === []) {
            throw ValidationException::withMessages([
                'product_ids' => ['Selecciona al menos un producto.'],
            ]);
        }

        $productos = Producto::query()
            ->whereIn('id', $ids)
            ->orderBy('id')
            ->lockForUpdate()
            ->get();

        if ($productos->count() !== count($ids)) {
            throw ValidationException::withMessages([
                'product_ids' => ['Uno o más productos no existen.'],
            ]);
        }

        /** @var list<array{producto: Producto, cantidad: int, descuento: float, precio_pagado_cents: int, unit_cents: int}> $lines */
        $lines = [];
        $catalogTotalCents = 0;

        foreach ($productos as $prod) {
            if ((bool) $prod->eliminado) {
                throw ValidationException::withMessages([
                    'product_ids' => ["El producto «{$prod->nombre}» no está disponible."],
                ]);
            }

            $cantidad = 1;
            if ((int) $prod->unidades < $cantidad) {
                throw ValidationException::withMessages([
                    'product_ids' => ["No hay stock suficiente de «{$prod->nombre}»."],
                ]);
            }

            $descuento = (float) ($prod->descuento ?? 0);
            $unitCents = StoreProductPricing::unitPriceCents($prod->precio, $descuento);
            $catalogTotalCents += $unitCents * $cantidad;

            $lines[] = [
                'producto' => $prod,
                'cantidad' => $cantidad,
                'descuento' => $descuento,
                'precio_pagado_cents' => $unitCents,
                'unit_cents' => $unitCents,
            ];
        }
        $paymentCents = $chargeAmountCents;

        if ($catalogTotalCents !== $paymentCents) {
            $expectedEuros = number_format(MoneyCents::centsToEuros($catalogTotalCents), 2, ',', '.');
            $actualEuros = number_format(MoneyCents::centsToEuros($paymentCents), 2, ',', '.');

            throw ValidationException::withMessages([
                'amount_cents' => [
                    "Importe línea ({$actualEuros} €) ≠ catálogo ({$expectedEuros} €).",
                ],
            ]);
        }

        $pedido = Pedido::query()->create([
            'user_id' => $user?->id,
            'guest_name' => $user === null ? $guestName : null,
            'guest_email' => $user === null ? (trim($guestEmail) ?: null) : null,
            'precio_total_cents' => $catalogTotalCents,
            'pagado' => true,
            'entregado' => false,
            'payment_method' => 'datafono',
        ]);

        foreach ($lines as $line) {
            /** @var Producto $prod */
            $prod = $line['producto'];
            $pedido->productos()->attach($prod->id, [
                'cantidad' => $line['cantidad'],
                'descuento_aplicado' => $line['descuento'],
                'precio_pagado_cents' => $line['precio_pagado_cents'],
            ]);
            $prod->decrement('unidades', $line['cantidad']);
        }

        return $pedido->fresh();
    }

    /**
     * Dispara B2B para cada payable del cobro (líneas de ticket o payable 1:1).
     * No-op si el cobro TPV ya lo cubre el TicketBAI del terminal.
     */
    public function dispatchFiscalInvoicesForPayment(DatafonoPayment $payment): void
    {
        $payment->loadMissing(['terminal', 'ticket.lines']);

        if ($this->isCoveredByTpvTicketBai($payment)) {
            return;
        }

        foreach ($this->fiscalTargetsForPayment($payment) as $target) {
            $sessionId = 'datafono-'.$payment->id.$target['session_suffix'];

            try {
                event(new PaymentConfirmed(
                    payableType: $target['payable_type'],
                    payableId: $target['payable_id'],
                    amountCents: $target['amount_cents'],
                    stripeSessionId: $sessionId,
                ));
            } catch (Throwable $e) {
                Log::error('DatafonoPaymentReconciliationService: PaymentConfirmed falló', [
                    'datafono_payment_id' => $payment->id,
                    'payable_type' => $target['payable_type'],
                    'payable_id' => $target['payable_id'],
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }

    /**
     * TPV con TicketBAI propio: Hacienda la gestiona el datáfono, no B2B.
     * Efectivo siempre pasa por B2B (el TPV no registra el metálico de la app).
     */
    private function isCoveredByTpvTicketBai(DatafonoPayment $payment): bool
    {
        if ($payment->source === DatafonoPayment::SOURCE_MANUAL_CASH) {
            return false;
        }

        $terminal = $payment->terminal ?? PaymentTerminal::query()->find($payment->payment_terminal_id);

        return $terminal === null || $terminal->emite_ticketbai_propio === true;
    }

    /**
     * @return list<array{payable_type: string, payable_id: int, amount_cents: int, session_suffix: string}>
     */
    private function fiscalTargetsForPayment(DatafonoPayment $payment): array
    {
        $payment->loadMissing('ticket.lines');
        $lines = $payment->ticket?->lines;

        if ($lines !== null && $lines->isNotEmpty()) {
            $targets = [];
            foreach ($lines as $line) {
                if ($line->payable_type === null || $line->payable_id === null) {
                    continue;
                }
                $targets[] = [
                    'payable_type' => (string) $line->payable_type,
                    'payable_id' => (int) $line->payable_id,
                    'amount_cents' => (int) $line->amount_cents,
                    'session_suffix' => '-L'.$line->id,
                ];
            }

            return $targets;
        }

        if ($payment->payable_type === null || $payment->payable_id === null) {
            return [];
        }

        return [[
            'payable_type' => (string) $payment->payable_type,
            'payable_id' => (int) $payment->payable_id,
            'amount_cents' => (int) $payment->amount_cents,
            'session_suffix' => '',
        ]];
    }

    /**
     * @param  Collection<int, DatafonoPayment>  $payments
     * @return array<string, FiscalInvoice>
     */
    private function fiscalInvoiceMapForPayments(Collection $payments): array
    {
        $pairs = [];
        foreach ($payments as $payment) {
            foreach ($this->fiscalTargetsForPayment($payment) as $target) {
                $key = $target['payable_type'].'#'.$target['payable_id'];
                $pairs[$key] = [$target['payable_type'], $target['payable_id']];
            }
        }

        if ($pairs === []) {
            return [];
        }

        $query = FiscalInvoice::query();
        $query->where(function ($outer) use ($pairs): void {
            foreach ($pairs as [$type, $id]) {
                $outer->orWhere(function ($inner) use ($type, $id): void {
                    $inner->where('payable_type', $type)->where('payable_id', $id);
                });
            }
        });

        $map = [];
        foreach ($query->get() as $invoice) {
            $map[$invoice->payable_type.'#'.$invoice->payable_id] = $invoice;
        }

        return $map;
    }

    /**
     * @param  array<string, FiscalInvoice>  $invoiceMap
     */
    private function resolveHaciendaStatus(DatafonoPayment $payment, array $invoiceMap): DatafonoHaciendaStatusDto
    {
        if ($payment->status !== DatafonoPayment::STATUS_ASSIGNED) {
            return new DatafonoHaciendaStatusDto(
                code: 'n_a',
                label: '—',
                canCommunicate: false,
                detailUrl: null,
            );
        }

        if ($this->isCoveredByTpvTicketBai($payment)) {
            return new DatafonoHaciendaStatusDto(
                code: 'tpv',
                label: 'Cubierto por TPV',
                canCommunicate: false,
                detailUrl: null,
            );
        }

        $targets = $this->fiscalTargetsForPayment($payment);
        if ($targets === []) {
            return new DatafonoHaciendaStatusDto(
                code: 'n_a',
                label: '—',
                canCommunicate: false,
                detailUrl: null,
            );
        }

        $invoices = [];
        foreach ($targets as $target) {
            $key = $target['payable_type'].'#'.$target['payable_id'];
            if (isset($invoiceMap[$key])) {
                $invoices[] = $invoiceMap[$key];
            }
        }

        if ($invoices === []) {
            return new DatafonoHaciendaStatusDto(
                code: 'pending',
                label: 'Pendiente de comunicar',
                canCommunicate: true,
                detailUrl: null,
            );
        }

        $statuses = array_map(
            fn (FiscalInvoice $invoice) => $invoice->status,
            $invoices,
        );

        $allRegistered = count($invoices) === count($targets)
            && collect($statuses)->every(fn (FiscalInvoiceStatus $s) => $s === FiscalInvoiceStatus::Registered);

        if ($allRegistered) {
            return new DatafonoHaciendaStatusDto(
                code: 'issued',
                label: 'Emitida',
                canCommunicate: false,
                detailUrl: null,
            );
        }

        if (collect($statuses)->contains(FiscalInvoiceStatus::Failed)) {
            return new DatafonoHaciendaStatusDto(
                code: 'failed',
                label: 'Error Hacienda',
                canCommunicate: true,
                detailUrl: null,
            );
        }

        if (count($invoices) < count($targets)) {
            return new DatafonoHaciendaStatusDto(
                code: 'pending',
                label: 'Pendiente de comunicar',
                canCommunicate: true,
                detailUrl: null,
            );
        }

        return new DatafonoHaciendaStatusDto(
            code: 'processing',
            label: 'TicketBAI en proceso',
            canCommunicate: false,
            detailUrl: null,
        );
    }

    private function assertOwnership(Model $payable, ?User $user, bool $allowAnonymousWithoutUser = false): void
    {
        $payableUserId = isset($payable->user_id) && $payable->user_id !== null
            ? (int) $payable->user_id
            : null;

        if ($user === null) {
            if ($payableUserId === null && $allowAnonymousWithoutUser) {
                return;
            }
            if ($payableUserId === null) {
                throw ValidationException::withMessages([
                    'user_id' => ['Selecciona el socio dueño de este pendiente.'],
                ]);
            }

            // Admin no eligió socio: se acepta y reconcile rellenará assigned_user_id.
            return;
        }

        if ($payableUserId === null) {
            throw ValidationException::withMessages([
                'payable_id' => ['Este pendiente no tiene socio; no puede asignarse a otro usuario.'],
            ]);
        }

        if ($payableUserId !== (int) $user->id) {
            throw ValidationException::withMessages([
                'payable_id' => ['El pendiente no pertenece a ese socio.'],
            ]);
        }
    }

    private function assertPayablePending(Model $payable): void
    {
        $isPending = match (true) {
            $payable instanceof PagoCuota => ($payable->status ?? '') === PagoCuota::STATUS_PENDING,
            $payable instanceof UserBono => ($payable->status ?? '') === UserBono::STATUS_PENDING,
            $payable instanceof Booking => ($payable->payment_status ?? '') === Booking::PAYMENT_PENDING
                || ($payable->payment_status === Booking::PAYMENT_CONFIRMED && $payable->balance_status === Booking::BALANCE_PENDING),
            $payable instanceof LessonUser => ($payable->payment_status ?? '') === LessonUser::PAYMENT_PENDING
                || ($payable->payment_status === LessonUser::PAYMENT_CONFIRMED && $payable->balance_status === LessonUser::BALANCE_PENDING),
            $payable instanceof PhotoSessionBooking => ($payable->payment_status ?? '') === PhotoSessionBooking::PAYMENT_PENDING,
            default => false,
        };

        if (! $isPending) {
            throw ValidationException::withMessages([
                'payable_id' => ['Este pendiente ya está pagado o no admite conciliación.'],
            ]);
        }
    }

    private function assertNotAlreadyLinked(Model $payable): void
    {
        $onPayment = DatafonoPayment::query()
            ->where('status', DatafonoPayment::STATUS_ASSIGNED)
            ->where('payable_type', $payable::class)
            ->where('payable_id', $payable->getKey())
            ->exists();

        $onTicketLine = MostradorTicketLine::query()
            ->where('payable_type', $payable::class)
            ->where('payable_id', $payable->getKey())
            ->exists();

        if ($onPayment || $onTicketLine) {
            throw ValidationException::withMessages([
                'payable_id' => ['Este pendiente ya está enlazado a otro cobro de datáfono.'],
            ]);
        }
    }

    private function assertAmountMatchesCents(int $actualCents, Model $payable): void
    {
        $expectedCents = $this->expectedAmountCents($payable);

        if ($expectedCents === $actualCents) {
            return;
        }

        $expectedEuros = number_format(MoneyCents::centsToEuros($expectedCents), 2, ',', '.');
        $actualEuros = number_format(MoneyCents::centsToEuros($actualCents), 2, ',', '.');

        throw ValidationException::withMessages([
            'amount_cents' => [
                "Importe ({$actualEuros} €) ≠ pendiente ({$expectedEuros} €).",
            ],
        ]);
    }

    /**
     * @return array{0: string, 1: string} [nombre, apellido]
     */
    private static function splitGuestName(string $fullName): array
    {
        $parts = preg_split('/\s+/', trim($fullName), 2) ?: [];
        $first = $parts[0] ?? '';
        $last = $parts[1] ?? '';

        return [$first, $last];
    }

    private function expectedAmountCents(Model $payable): int
    {
        return match (true) {
            $payable instanceof PagoCuota => (int) ($payable->monto_pagado_cents ?? 0),
            $payable instanceof UserBono => MoneyCents::eurosToCents((float) ($payable->pack?->precio ?? 0)),
            // Depósito (payment_status pending) exige el importe íntegro; el resto
            // (payment_status confirmed + balance_status pending) exige solo lo que falta.
            $payable instanceof Booking => $payable->payment_status === Booking::PAYMENT_CONFIRMED && $payable->balance_status === Booking::BALANCE_PENDING
                ? $payable->remainingBalanceCents()
                : MoneyCents::eurosToCents((float) ($payable->total_price ?? 0)),
            // Igual que el alquiler: si la señal online ya está cobrada, en
            // mostrador solo se exige el resto de la clase particular.
            $payable instanceof LessonUser => $payable->payment_status === LessonUser::PAYMENT_CONFIRMED && $payable->balance_status === LessonUser::BALANCE_PENDING
                ? $payable->remainingBalanceCents()
                : MoneyCents::eurosToCents((float) ($payable->lesson?->price ?? 20)),
            $payable instanceof PhotoSessionBooking => (int) ($payable->precio_pagado_cents ?? 0),
            $payable instanceof Pedido => (int) ($payable->precio_total_cents ?? 0),
            default => 0,
        };
    }
}
