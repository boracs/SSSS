<?php

declare(strict_types=1);

namespace App\Services;

use App\DTOs\Rentals\RentalRequestDto;
use App\DTOs\Rentals\RentalWindowDto;
use App\Enums\PaymentStatus;
use App\Exceptions\TransactionRequiredException;
use App\Models\Booking;
use App\Models\PriceSchema;
use App\Models\Surfboard;
use App\Services\Rentals\RentalPolicyService;
use App\Support\BusinessDateTime;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;

/**
 * Fuente única (SSOT) para disponibilidad, precios y reservas de alquiler.
 *
 * Modelo temporal:
 *   pickup_at  → return_at : tiempo cobrado (packs de PriceSchema)
 *   pickup_at  → block_end : ventana de inventario = return_at + buffer de rotación
 * El buffer NUNCA entra en el precio.
 */
class BookingService
{
    public function __construct(
        private readonly RentalPolicyService $policy,
    ) {}

    /**
     * @return array{total_price: float, deposit_amount: float}
     */
    public function resolvePricing(PriceSchema $schema, \DateTimeInterface $startDate, \DateTimeInterface $endDate, ?float $depositPercentage = null): array
    {
        return $this->buildPricing(
            $this->calculateBestPrice($schema, $startDate, $endDate),
            $depositPercentage,
        );
    }

    /**
     * Precio de una ventana ya resuelta: se cobra chargedMinutes, nunca el buffer.
     *
     * @return array{total_price: float, deposit_amount: float}
     */
    public function resolvePricingForWindow(PriceSchema $schema, RentalWindowDto $window, ?float $depositPercentage = null): array
    {
        return $this->buildPricing(
            $this->priceForMinutes($schema, $window->chargedMinutes),
            $depositPercentage,
        );
    }

    /**
     * Mejor precio para un rango concreto (compone packs).
     */
    public function calculateBestPrice(PriceSchema $schema, \DateTimeInterface $startDate, \DateTimeInterface $endDate): float
    {
        return $this->priceForMinutes($schema, $this->chargedMinutesBetween($startDate, $endDate));
    }

    /**
     * Programación dinámica sobre minutos: cubre la duración cobrada con la
     * combinación de packs más barata. Un pack puede "sobrar" (se paga entero
     * aunque el tramo restante sea menor), que es la regla real de mostrador.
     */
    public function priceForMinutes(PriceSchema $schema, int $minutes): float
    {
        if ($minutes <= 0) {
            return 0.0;
        }

        $packs = $schema->getSellablePacksByMinutes();
        if ($packs === []) {
            return 0.0;
        }

        $step = $this->pricingStepMinutes();
        $slots = (int) ceil($minutes / $step);
        $cost = [0 => 0.0];

        for ($slot = 1; $slot <= $slots; $slot++) {
            $best = null;
            foreach ($packs as $packMinutes => $price) {
                $packSlots = max(1, (int) ceil($packMinutes / $step));
                $candidate = $price + $cost[max(0, $slot - $packSlots)];
                if ($best === null || $candidate < $best) {
                    $best = $candidate;
                }
            }
            $cost[$slot] = (float) $best;
        }

        return round($cost[$slots], 2);
    }

    public function calculateDeposit(float $totalPrice, ?float $percentage = null): float
    {
        $percentage ??= (float) config('rentals.deposit_percentage', 30);

        return round($totalPrice * ($percentage / 100), 2);
    }

    // ─────────────────────────────────────────────────────────────
    // Ventanas: modo día (12:00 → 12:00), modo hora (packs de minutos)
    // ─────────────────────────────────────────────────────────────

    public function bufferMinutes(): int
    {
        return max(0, (int) config('rentals.turnover_buffer_minutes', 30));
    }

    public function pickupFlexibilityMinutes(): int
    {
        return max(0, (int) config('rentals.pickup_flexibility_minutes', 30));
    }

    /**
     * Traduce la petición validada a una ventana concreta.
     */
    public function buildWindow(RentalRequestDto $request): RentalWindowDto
    {
        $mode = $request->mode ?? ($request->packMinutes !== null
            ? RentalWindowDto::MODE_HOUR
            : RentalWindowDto::MODE_DAY);

        if ($mode === RentalWindowDto::MODE_HOUR) {
            if ($request->packMinutes === null) {
                throw new InvalidArgumentException('Falta el pack de horas del alquiler.');
            }

            return $this->normalizeHourWindow(
                $this->parsePickupDateTime($request->startDate),
                $request->packMinutes,
            );
        }

        $days = $request->packDays ?? $this->deriveDaysFromRange($request->startDate, $request->endDate);

        return $this->normalizeDayRange(
            BusinessDateTime::parseRentalDate($request->startDate),
            $days,
        );
    }

    /**
     * Modo día: D 12:00 → D+N 12:00 en el reloj de pared de la escuela.
     */
    public function normalizeDayRange(\DateTimeInterface $start, int $days): RentalWindowDto
    {
        $days = $this->assertDaysInRange($days);
        $pickupAt = $this->atDayModeHour($start);
        $returnAt = $pickupAt->copy()->addDays($days);

        return $this->makeWindow(
            mode: RentalWindowDto::MODE_DAY,
            pickupAt: $pickupAt,
            returnAt: $returnAt,
            chargedMinutes: $days * PriceSchema::MINUTES_PER_DAY,
            packMinutes: null,
            // pack_days solo si el tramo coincide con un pack ofertado (1,2,3,4,5,7).
            packDays: array_key_exists($days, PriceSchema::DAY_PACKS) ? $days : null,
        );
    }

    /**
     * Modo hora: pickup + pack de minutos (60, 90, 120, 180, 240, 360).
     */
    public function normalizeHourWindow(\DateTimeInterface $pickupAt, int $packMinutes): RentalWindowDto
    {
        if (! array_key_exists($packMinutes, PriceSchema::MINUTE_PACKS)) {
            throw new InvalidArgumentException('Pack de horas no válido: '.$packMinutes.' min.');
        }

        $pickup = Carbon::instance($pickupAt)->timezone(BusinessDateTime::businessTimezone())->seconds(0);

        $this->assertWithinPickupWindow($pickup, $packMinutes);

        return $this->makeWindow(
            mode: RentalWindowDto::MODE_HOUR,
            pickupAt: $pickup,
            returnAt: $pickup->copy()->addMinutes($packMinutes),
            chargedMinutes: $packMinutes,
            packMinutes: $packMinutes,
            packDays: null,
        );
    }

    // ─────────────────────────────────────────────────────────────
    // Disponibilidad (sobre la ventana de inventario, con buffer)
    // ─────────────────────────────────────────────────────────────

    /**
     * Comprobación de disponibilidad para UI/API (envuelve transacción de lectura).
     */
    public function checkAvailability(int $surfboardId, \DateTimeInterface $startDate, \DateTimeInterface $endDate, ?int $excludeBookingId = null): bool
    {
        return DB::transaction(fn () => $this->isAvailable($surfboardId, $startDate, $endDate, $excludeBookingId));
    }

    public function isWindowAvailable(int $surfboardId, RentalWindowDto $window, ?int $excludeBookingId = null): bool
    {
        return $this->isAvailable($surfboardId, $window->pickupAt, $window->blockEnd, $excludeBookingId);
    }

    /**
     * Solape sobre datetimes reales bajo transacción activa (anti-overbooking).
     * Los extremos que se tocan NO colisionan: para eso existe el buffer.
     */
    public function isAvailable(int $surfboardId, \DateTimeInterface $blockStart, \DateTimeInterface $blockEnd, ?int $excludeBookingId = null): bool
    {
        $this->assertActiveTransaction(__FUNCTION__);

        $start = BusinessDateTime::toDatabaseString($blockStart);
        $end = BusinessDateTime::toDatabaseString($blockEnd);

        $query = Booking::query()
            ->where('surfboard_id', $surfboardId)
            ->blocking()
            ->lockForUpdate()
            ->whereRaw('COALESCE(pickup_at, start_date) < ?', [$end])
            ->whereRaw('COALESCE(block_end, end_date) > ?', [$start]);

        if ($excludeBookingId !== null) {
            $query->where('id', '!=', $excludeBookingId);
        }

        return $query->doesntExist();
    }

    /**
     * Ventanas ocupadas (inventario), con el detalle completo que necesita el
     * panel admin (id de reserva incluido). Para el endpoint PÚBLICO usar
     * {@see getPublicBlockedRanges()}, que no expone ids ni el estado interno.
     *
     * @return array{id: int, start: string, end: string, return_at: string, status: string, display_status: string}[]
     */
    public function getBlockedRanges(int $surfboardId, \DateTimeInterface $from, \DateTimeInterface $to): array
    {
        $fromDb = BusinessDateTime::toDatabaseString($from);
        $toDb = BusinessDateTime::toDatabaseString($to);

        return Booking::query()
            ->where('surfboard_id', $surfboardId)
            ->blocking()
            ->whereRaw('COALESCE(pickup_at, start_date) <= ?', [$toDb])
            ->whereRaw('COALESCE(block_end, end_date) >= ?', [$fromDb])
            ->orderByRaw('COALESCE(pickup_at, start_date)')
            ->get()
            ->map(function (Booking $booking) {
                $pickup = $booking->pickup_at ?? $booking->start_date;
                $return = $booking->return_at ?? $booking->end_date;
                $blockEnd = $booking->block_end ?? $return;

                return [
                    'id' => (int) $booking->id,
                    'start' => $pickup ? BusinessDateTime::toApi($pickup) : '',
                    'end' => $blockEnd ? BusinessDateTime::toApi($blockEnd) : '',
                    'return_at' => $return ? BusinessDateTime::toApi($return) : '',
                    'status' => (string) $booking->status,
                    'display_status' => $booking->payment_status === Booking::PAYMENT_CONFIRMED
                        ? 'ocupado'
                        : 'pendiente',
                ];
            })
            ->values()
            ->all();
    }

    /**
     * Ventanas ocupadas para el calendario/hour-picker PÚBLICOS: solo el rango
     * de inventario y el color a pintar. Sin id de reserva (no es de nadie más
     * asunto qué reserva concreta ocupa la tabla) ni el estado interno crudo.
     *
     * @return array{start: string, end: string, display_status: string}[]
     */
    public function getPublicBlockedRanges(int $surfboardId, \DateTimeInterface $from, \DateTimeInterface $to): array
    {
        return array_map(
            static fn (array $range) => [
                'start' => $range['start'],
                'end' => $range['end'],
                'display_status' => $range['display_status'],
            ],
            $this->getBlockedRanges($surfboardId, $from, $to),
        );
    }

    // ─────────────────────────────────────────────────────────────
    // Creación de reserva
    // ─────────────────────────────────────────────────────────────

    /**
     * Minutos de gracia de una reserva pública que va directa a Stripe Checkout:
     * si el cliente abandona el pago, la tabla no debe quedar bloqueada días.
     */
    public function pendingUnpaidExpirationMinutes(): int
    {
        return max(1, (int) config('rentals.pending_unpaid_expiration_minutes', 45));
    }

    /**
     * Crea reserva en estado pending + pago pending (pasarela o validación manual).
     *
     * `$expiresInMinutes` es la caducidad corta del flujo público con Stripe
     * ({@see pendingUnpaidExpirationMinutes()}). Sin él (creación manual en
     * Admin, pago por transferencia/bizum) se mantiene la caducidad larga de
     * `rentals.pending_expiration_days`, porque ahí el cliente sube el
     * comprobante días después.
     *
     * @param  array<string, mixed>  $clientData
     */
    public function createPendingBooking(
        Surfboard $surfboard,
        RentalWindowDto $window,
        array $clientData,
        ?UploadedFile $proofFile = null,
        ?int $userId = null,
        ?int $expiresInMinutes = null,
    ): Booking {
        return DB::transaction(function () use ($surfboard, $window, $clientData, $proofFile, $userId, $expiresInMinutes) {
            $locked = Surfboard::query()->whereKey($surfboard->id)->lockForUpdate()->firstOrFail();

            // Última barrera: aunque el formulario venga de una ficha cacheada,
            // una tabla retirada del inventario no se puede reservar.
            if (! $locked->is_active) {
                throw new InvalidArgumentException('Esta tabla está retirada del alquiler.');
            }

            if (! $this->isWindowAvailable((int) $surfboard->id, $window)) {
                throw new InvalidArgumentException('La tabla no está disponible en el rango solicitado.');
            }

            $schema = $surfboard->priceSchema;
            if ($schema === null) {
                throw new InvalidArgumentException('La tabla no tiene esquema de precios configurado.');
            }

            $pricing = $this->resolvePricingForWindow($schema, $window);
            $proofPath = null;
            $proofUploadedAt = null;

            if ($proofFile !== null) {
                $proofPath = $proofFile->storeAs(
                    'payment-proofs/rentals',
                    Str::uuid()->toString().'.'.$proofFile->getClientOriginalExtension(),
                    'local'
                );
                if ($proofPath === false || $proofPath === null) {
                    throw new InvalidArgumentException('No se pudo almacenar el justificante de pago.');
                }
                $proofUploadedAt = now();
            }

            return Booking::query()->create([
                'surfboard_id' => $surfboard->id,
                'user_id' => $userId,
                'client_name' => (string) ($clientData['client_name'] ?? ''),
                'client_email' => $clientData['client_email'] ?? null,
                'client_phone' => $clientData['client_phone'] ?? null,
                'mode' => $window->mode,
                'start_date' => $window->pickupAt,
                'end_date' => $window->returnAt,
                'pickup_at' => $window->pickupAt,
                'return_at' => $window->returnAt,
                'block_end' => $window->blockEnd,
                'pack_minutes' => $window->packMinutes,
                'pack_days' => $window->packDays,
                'expires_at' => $expiresInMinutes !== null
                    ? Carbon::now()->addMinutes(max(1, $expiresInMinutes))
                    : Carbon::now()->addDays((int) config('rentals.pending_expiration_days', 7)),
                'status' => Booking::STATUS_PENDING,
                'payment_status' => PaymentStatus::Pending->value,
                'payment_proof_path' => $proofPath,
                'proof_uploaded_at' => $proofUploadedAt,
                'payment_method' => $clientData['payment_method'] ?? null,
                'total_price' => $pricing['total_price'],
                'deposit_amount' => $pricing['deposit_amount'],
                'payment_proof_note' => null,
            ]);
        });
    }

    /**
     * @return Collection<int, Booking>
     */
    public function autoExpirePending(): Collection
    {
        $expired = Booking::query()->expiredPending()->get();
        foreach ($expired as $booking) {
            $booking->update(['status' => Booking::STATUS_CANCELLED]);
        }

        return $expired;
    }

    // ─────────────────────────────────────────────────────────────
    // No-show: la tabla vuelve al inventario si nadie la recoge
    // ─────────────────────────────────────────────────────────────

    public function noShowGraceMinutes(): int
    {
        return max(0, (int) config('rentals.no_show_grace_minutes', 30));
    }

    /**
     * El barrido automático solo debe correr cuando el mostrador registra la
     * recogida; si no, cualquier reserva pasada parecería un no-show.
     */
    public function isNoShowSweepEnabled(): bool
    {
        return (bool) config('rentals.no_show_release_enabled', false);
    }

    /**
     * Candidatas del barrido: recogidas recientes vencidas, sin registrar y
     * sin el alquiler pagado entero.
     *
     * @return Collection<int, Booking>
     */
    public function noShowCandidates(?\DateTimeInterface $now = null): Collection
    {
        $reference = $now !== null ? Carbon::instance($now) : BusinessDateTime::now();

        return Booking::query()
            ->noShowCandidates(
                $reference->copy()->subMinutes($this->noShowGraceMinutes()),
                $reference->copy()->subHours(max(1, (int) config('rentals.no_show_lookback_hours', 24))),
            )
            ->get();
    }

    /**
     * Reservas que el barrido respeta por tener el alquiler pagado completo
     * (misma ventana temporal que las candidatas). Solo para diagnóstico.
     *
     * @return Collection<int, Booking>
     */
    public function noShowProtectedByPayment(?\DateTimeInterface $now = null): Collection
    {
        $reference = $now !== null ? Carbon::instance($now) : BusinessDateTime::now();

        return Booking::query()
            ->fullyPaid()
            ->whereIn('status', [Booking::STATUS_PENDING, Booking::STATUS_CONFIRMED])
            ->whereNull('picked_up_at')
            ->whereNull('no_show_at')
            ->whereNotNull('pickup_at')
            ->where('pickup_at', '<', $reference->copy()->subMinutes($this->noShowGraceMinutes()))
            ->where('pickup_at', '>=', $reference->copy()->subHours(max(1, (int) config('rentals.no_show_lookback_hours', 24))))
            ->get();
    }

    /**
     * Libera las reservas no recogidas cuyo margen de cortesía ya venció.
     * No hace nada si el barrido está desactivado en config.
     *
     * @return Collection<int, Booking>
     */
    public function releaseNoShows(?\DateTimeInterface $now = null): Collection
    {
        if (! $this->isNoShowSweepEnabled()) {
            return new Collection();
        }

        $reference = $now !== null ? Carbon::instance($now) : BusinessDateTime::now();
        $cutoff = $reference->copy()->subMinutes($this->noShowGraceMinutes());
        $notBefore = $reference->copy()->subHours(max(1, (int) config('rentals.no_show_lookback_hours', 24)));

        return DB::transaction(function () use ($cutoff, $notBefore, $reference) {
            $candidates = Booking::query()
                ->noShowCandidates($cutoff, $notBefore)
                ->lockForUpdate()
                ->get();

            foreach ($candidates as $booking) {
                $this->markAsNoShow($booking, $reference);
            }

            return $candidates;
        });
    }

    /**
     * Libera una reserva concreta si ya es no-show. Devuelve true si la liberó.
     */
    public function releaseIfNoShow(Booking $booking, ?\DateTimeInterface $now = null): bool
    {
        $reference = $now !== null ? Carbon::instance($now) : BusinessDateTime::now();

        if (! $this->isNoShow($booking, $reference)) {
            return false;
        }

        DB::transaction(function () use ($booking, $reference) {
            $locked = Booking::query()->whereKey($booking->id)->lockForUpdate()->first();
            if ($locked !== null && $this->isNoShow($locked, $reference)) {
                $this->markAsNoShow($locked, $reference);
                $booking->refresh();
            }
        });

        return $booking->no_show_at !== null;
    }

    public function isNoShow(Booking $booking, ?\DateTimeInterface $now = null): bool
    {
        $reference = $now !== null ? Carbon::instance($now) : BusinessDateTime::now();
        $pickupAt = $booking->pickup_at ?? $booking->start_date;

        if ($pickupAt === null || $booking->picked_up_at !== null || $booking->no_show_at !== null) {
            return false;
        }

        if (! in_array($booking->status, [Booking::STATUS_PENDING, Booking::STATUS_CONFIRMED], true)) {
            return false;
        }

        // Quien pagó el alquiler entero conserva su ventana aunque llegue tarde.
        if ($booking->isRentalFullyPaid()) {
            return false;
        }

        return $reference->greaterThan(
            Carbon::instance($pickupAt)->addMinutes($this->noShowGraceMinutes())
        );
    }

    /**
     * Marca la recogida efectiva (el mostrador entrega la tabla).
     *
     * Guarda de integridad: no se entrega una tabla sin pago confirmado (ni la
     * señal online ni la validación manual del comprobante lo han registrado
     * todavía). Esto es independiente de si cubre el 100 % del alquiler —esa
     * decisión de producto (señal vs prepago íntegro) sigue pendiente y no
     * afecta aquí: basta con que `payment_status` sea `confirmed`.
     */
    public function markPickedUp(Booking $booking, ?\DateTimeInterface $at = null): Booking
    {
        if ($booking->payment_status !== Booking::PAYMENT_CONFIRMED) {
            throw new InvalidArgumentException('No se puede registrar la recogida sin el pago confirmado.');
        }

        $booking->forceFill([
            'picked_up_at' => $at !== null ? Carbon::instance($at) : BusinessDateTime::now(),
            'no_show_at' => null,
        ])->save();

        return $booking;
    }

    // ─────────────────────────────────────────────────────────────
    // Internos
    // ─────────────────────────────────────────────────────────────

    /**
     * El no-show cancela y libera inventario, pero NO decide sobre el dinero:
     * la señal queda como está y el admin resuelve la devolución si procede.
     */
    private function markAsNoShow(Booking $booking, Carbon $at): void
    {
        $note = trim((string) $booking->admin_notes);
        $stamp = $at->format('d/m/Y H:i');
        $booking->forceFill([
            'no_show_at' => $at,
            'status' => Booking::STATUS_CANCELLED,
            'admin_notes' => trim($note."\nNo-show: tabla liberada automáticamente el {$stamp}."),
        ])->save();
    }

    /**
     * @return array{total_price: float, deposit_amount: float}
     */
    private function buildPricing(float $totalPrice, ?float $depositPercentage): array
    {
        return [
            'total_price' => $totalPrice,
            'deposit_amount' => $this->calculateDeposit($totalPrice, $depositPercentage),
        ];
    }

    private function makeWindow(
        string $mode,
        Carbon $pickupAt,
        Carbon $returnAt,
        int $chargedMinutes,
        ?int $packMinutes,
        ?int $packDays,
    ): RentalWindowDto {
        $buffer = $this->bufferMinutes();

        return new RentalWindowDto(
            mode: $mode,
            pickupAt: $pickupAt,
            returnAt: $returnAt,
            blockEnd: $returnAt->copy()->addMinutes($buffer),
            chargedMinutes: $chargedMinutes,
            packMinutes: $packMinutes,
            packDays: $packDays,
            bufferMinutes: $buffer,
            pickupFlexibilityMinutes: $this->pickupFlexibilityMinutes(),
        );
    }

    /**
     * En modo hora la recogida es un dato del cliente: sin hora no hay reserva
     * (el selector de recogida siempre la envía).
     */
    private function parsePickupDateTime(string $value): Carbon
    {
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', trim($value)) === 1) {
            throw new InvalidArgumentException('Indica la hora de recogida para un alquiler por horas.');
        }

        return BusinessDateTime::parseInAppTimezone($value);
    }

    /**
     * Recogida y devolución cobrada deben caber en el horario de mostrador.
     */
    private function assertWithinPickupWindow(Carbon $pickup, int $packMinutes): void
    {
        $policy = $this->policy->current();
        $open = $this->minutesOfDay($policy->pickupWindowStart);
        $close = $this->minutesOfDay($policy->pickupWindowEnd);

        if ($close <= $open) {
            return;
        }

        $pickupMinutes = $pickup->hour * 60 + $pickup->minute;

        if ($pickupMinutes < $open || $pickupMinutes + $packMinutes > $close) {
            throw new InvalidArgumentException(
                "La recogida y la devolución deben estar entre las {$policy->pickupWindowStart} y las {$policy->pickupWindowEnd}."
            );
        }
    }

    private function minutesOfDay(string $time): int
    {
        [$hour, $minute] = array_pad(explode(':', $time), 2, '0');

        return ((int) $hour) * 60 + (int) $minute;
    }

    private function atDayModeHour(\DateTimeInterface $date): Carbon
    {
        $hour = max(0, min(23, (int) config('rentals.day_mode_pickup_hour', 12)));

        return Carbon::instance($date)
            ->timezone(BusinessDateTime::businessTimezone())
            ->setTime($hour, 0, 0);
    }

    /**
     * Días cobrados de un rango de calendario legacy (start/end como fechas).
     * Mismo día = 1 día; D → D+2 = 2 días. Espejo exacto del cálculo JS.
     */
    private function deriveDaysFromRange(string $startDate, ?string $endDate): int
    {
        $start = BusinessDateTime::parseRentalDate($startDate)->startOfDay();
        $end = $endDate !== null && $endDate !== ''
            ? BusinessDateTime::parseRentalDate($endDate)->startOfDay()
            : $start->copy();

        return $this->assertDaysInRange(max(1, (int) round($start->diffInDays($end, true))));
    }

    private function assertDaysInRange(int $days): int
    {
        $max = max(1, (int) config('rentals.max_rental_days', 60));

        if ($days < 1) {
            throw new InvalidArgumentException('La duración del alquiler debe ser de al menos un día.');
        }

        if ($days > $max) {
            throw new InvalidArgumentException("La duración máxima de alquiler es de {$max} días.");
        }

        return $days;
    }

    private function chargedMinutesBetween(\DateTimeInterface $startDate, \DateTimeInterface $endDate): int
    {
        $seconds = Carbon::instance($endDate)->getTimestamp() - Carbon::instance($startDate)->getTimestamp();

        return $seconds <= 0 ? 0 : (int) ceil($seconds / 60);
    }

    private function pricingStepMinutes(): int
    {
        return max(1, (int) config('rentals.pricing_step_minutes', 30));
    }

    private function assertActiveTransaction(string $method): void
    {
        if (DB::transactionLevel() < 1) {
            throw TransactionRequiredException::forMethod(self::class, $method);
        }
    }
}
