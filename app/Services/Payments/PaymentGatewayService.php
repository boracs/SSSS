<?php

declare(strict_types=1);

namespace App\Services\Payments;

use App\Contracts\Payments\FindsOpenCheckout;
use App\DTOs\Payments\CheckoutSessionResultDto;
use App\DTOs\Payments\InitiatePaymentDto;
use App\Enums\PaymentStatus;
use App\Actions\Photos\ConfirmPhotoBookingPaymentAction;
use App\Models\Auction;
use App\Models\Booking;
use App\Models\LessonUser;
use App\Models\PagoCuota;
use App\Models\Pedido;
use App\Models\PaymentReceipt;
use App\Models\PaymentWebhookIdempotency;
use App\Models\PhotoSessionBooking;
use App\Models\UserBono;
use App\Services\Auctions\AuctionSettlementService;
use App\Services\BonoService;
use App\Services\Taquilla\TaquillaMembershipService;
use App\Support\BusinessDateTime;
use Carbon\CarbonImmutable;
use DateTimeInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Stripe\Exception\ApiErrorException;
use Stripe\StripeClient;
use Throwable;

/**
 * Orquestador de pagos (Stripe Checkout) con idempotencia de webhooks.
 */
final class PaymentGatewayService implements FindsOpenCheckout
{
    private ?StripeClient $stripe = null;

    public function __construct(
        private readonly BonoService $bonoService,
        private readonly TaquillaMembershipService $taquillaService,
    ) {}

    private function stripe(): StripeClient
    {
        if ($this->stripe !== null) {
            return $this->stripe;
        }

        $secret = config('services.stripe.secret');

        if (! is_string($secret) || trim($secret) === '') {
            throw new \RuntimeException(
                'Stripe no está configurado. Añade STRIPE_SECRET y STRIPE_KEY en tu archivo .env y ejecuta php artisan config:clear.'
            );
        }

        $this->stripe = new StripeClient($secret);

        return $this->stripe;
    }

    /**
     * Crea una sesión de Stripe Checkout y registra la intención en DB.
     *
     * @throws \RuntimeException si Stripe no devuelve URL o falla la DB
     */
    public function createCheckoutSession(InitiatePaymentDto $dto): CheckoutSessionResultDto
    {
        Log::withContext([
            'payable_type' => $dto->payableType,
            'payable_id'   => $dto->payableId,
        ]);

        $idempotencyToken = (string) Str::uuid();
        $totalCents       = $dto->totalAmountCents();
        $payload          = [
            'payment_method_types' => ['card'],
            'line_items'           => array_map(
                static fn ($item) => $item->toStripeLineItem(),
                $dto->lineItems,
            ),
            'mode'           => 'payment',
            'customer_email' => $dto->customerEmail,
            'success_url'    => $dto->successUrl(),
            'cancel_url'     => $dto->cancelUrl(),
            'metadata'       => array_merge($dto->metadata, [
                'payable_type'      => $dto->payableType,
                'payable_id'        => (string) $dto->payableId,
                'idempotency_token' => $idempotencyToken,
            ]),
        ];
        $stripeExpiresAt = $this->stripeExpiresAtTimestamp($dto->expiresAt);
        if ($stripeExpiresAt !== null) {
            $payload['expires_at'] = $stripeExpiresAt;
        }

        try {
            $session = $this->stripe()->checkout->sessions->create($payload);
        } catch (ApiErrorException $e) {
            Log::error('PaymentGatewayService::createCheckoutSession Stripe API error', [
                'message'      => $e->getMessage(),
                'stripe_code'  => $e->getStripeCode(),
                'payable_type' => $dto->payableType,
                'payable_id'   => $dto->payableId,
            ]);
            throw new \RuntimeException('No se pudo iniciar el pago. Inténtelo de nuevo.', 0, $e);
        } catch (Throwable $e) {
            Log::error('PaymentGatewayService::createCheckoutSession error inesperado', [
                'payable_type' => $dto->payableType,
                'payable_id'   => $dto->payableId,
                'error'        => $e->getMessage(),
            ]);
            throw new \RuntimeException('No se pudo iniciar el pago. Inténtelo de nuevo.', 0, $e);
        }

        $sessionId = (string) ($session->id ?? '');
        $checkoutUrl = (string) ($session->url ?? '');

        if ($sessionId === '' || $checkoutUrl === '') {
            Log::error('PaymentGatewayService::createCheckoutSession respuesta Stripe incompleta', [
                'session_id'   => $sessionId ?: null,
                'payable_type' => $dto->payableType,
                'payable_id'   => $dto->payableId,
            ]);
            throw new \RuntimeException('Respuesta inesperada de la pasarela de pagos.');
        }

        $expiresAtTs = (int) ($session->expires_at ?? 0);

        $this->registerPaymentIntent(
            transactionId: $sessionId,
            payableType: $dto->payableType,
            payableId: $dto->payableId,
            expectedAmountCents: $totalCents,
            idempotencyToken: $idempotencyToken,
            checkoutUrl: $checkoutUrl,
            expiresAt: $expiresAtTs > 0 ? CarbonImmutable::createFromTimestampUTC($expiresAtTs) : null,
        );

        Log::info('PaymentGatewayService::createCheckoutSession sesión creada', [
            'session_id'        => $sessionId,
            'amount_cents'      => $totalCents,
            'idempotency_token' => $idempotencyToken,
        ]);

        return new CheckoutSessionResultDto(
            checkoutUrl: $checkoutUrl,
            stripeSessionId: $sessionId,
            idempotencyToken: $idempotencyToken,
        );
    }

    /**
     * Registra intención de cobro (idempotente: si ya existe la devuelve tal cual).
     */
    public function registerPaymentIntent(
        string $transactionId,
        string $payableType,
        int $payableId,
        int $expectedAmountCents,
        string $idempotencyToken = '',
        ?string $checkoutUrl = null,
        ?DateTimeInterface $expiresAt = null,
    ): PaymentWebhookIdempotency {
        $transactionId = trim($transactionId);
        if ($transactionId === '') {
            throw new \InvalidArgumentException('transaction_id vacío');
        }

        return DB::transaction(function () use ($transactionId, $payableType, $payableId, $expectedAmountCents, $idempotencyToken, $checkoutUrl, $expiresAt) {
            $existing = PaymentWebhookIdempotency::query()
                ->where('transaction_id', $transactionId)
                ->lockForUpdate()
                ->first();

            if ($existing !== null) {
                return $existing;
            }

            return PaymentWebhookIdempotency::query()->create([
                'transaction_id'     => $transactionId,
                'idempotency_token'  => $idempotencyToken !== '' ? $idempotencyToken : null,
                'checkout_url'       => $checkoutUrl,
                'payable_type'       => $payableType,
                'payable_id'         => $payableId,
                'amount'             => $expectedAmountCents,
                'status'             => 'pending',
                'expires_at'         => $expiresAt,
            ]);
        });
    }

    /**
     * Sesión Stripe todavía utilizable para ese payable (F1/F2: evita abrir una
     * segunda sesión con el doble clic y que el cliente pueda pagar dos veces).
     */
    public function openCheckoutUrlFor(string $payableType, int $payableId): ?string
    {
        return PaymentWebhookIdempotency::liveCheckoutUrlFor($payableType, $payableId);
    }

    /**
     * Respaldo idempotente cuando el usuario vuelve de Stripe Checkout.
     * El webhook sigue siendo la vía principal; esto cubre local sin túnel y latencia del webhook.
     *
     * @return array{ok: bool, duplicate: bool, retryable: bool, payable_type: string, payable_id: int, message: string, amount_cents?: int}
     */
    public function syncCheckoutSessionIfPaid(string $sessionId): array
    {
        $sessionId = trim($sessionId);
        if ($sessionId === '') {
            return $this->failure('session_id vacío');
        }

        try {
            $session = $this->stripe()->checkout->sessions->retrieve($sessionId);
        } catch (ApiErrorException $e) {
            Log::warning('PaymentGatewayService::syncCheckoutSessionIfPaid sesión no recuperable', [
                'session_id' => $sessionId,
                'error'      => $e->getMessage(),
            ]);

            return $this->failure('Sesión Stripe no encontrada');
        } catch (Throwable $e) {
            Log::error('PaymentGatewayService::syncCheckoutSessionIfPaid error inesperado', [
                'session_id' => $sessionId,
                'error'      => $e->getMessage(),
            ]);

            return $this->failure('Error al verificar el pago');
        }

        if (($session->payment_status ?? '') !== 'paid') {
            return $this->failure('El pago aún no está completado en Stripe');
        }

        $result = $this->confirmPaymentFromWebhook(
            transactionId: $sessionId,
            amountCents: (int) ($session->amount_total ?? 0),
            idempotencyToken: (string) ($session->metadata['idempotency_token'] ?? ''),
        );

        if ($result['ok']) {
            $result['amount_cents'] = (int) ($session->amount_total ?? 0);
        }

        return $result;
    }

    /**
     * Confirma reserva/pedido tras webhook exitoso de Stripe.
     *
     * `retryable` distingue el fallo que se resuelve solo (el llamante debe reintentar) del
     * definitivo (reintentar no cambia nada). Lo consume PaymentWebhookController para
     * elegir entre 5xx y 200.
     *
     * @return array{ok: bool, duplicate: bool, retryable: bool, payable_type: string, payable_id: int, message: string}
     */
    public function confirmPaymentFromWebhook(
        string $transactionId,
        int $amountCents,
        string $idempotencyToken = '',
    ): array {
        $transactionId = trim($transactionId);
        if ($transactionId === '') {
            Log::error('PaymentGatewayService::confirmPaymentFromWebhook transaction_id vacío', [
                'amount_cents' => $amountCents,
            ]);

            return $this->failure('transaction_id inválido');
        }

        return DB::transaction(function () use ($transactionId, $amountCents, $idempotencyToken) {
            $intent = PaymentWebhookIdempotency::query()
                ->where('transaction_id', $transactionId)
                ->lockForUpdate()
                ->first();

            if ($intent === null) {
                Log::error('PaymentGatewayService::confirmPaymentFromWebhook intent no registrado', [
                    'transaction_id' => $transactionId,
                    'amount_cents'   => $amountCents,
                ]);

                return $this->failure('Intención de pago no registrada');
            }

            if ($intent->status === 'processed') {
                Log::info('PaymentGatewayService::confirmPaymentFromWebhook duplicado (idempotente)', [
                    'transaction_id' => $transactionId,
                    'payable_type'   => $intent->payable_type,
                    'payable_id'     => $intent->payable_id,
                ]);

                return [
                    'ok'           => true,
                    'duplicate'    => true,
                    'retryable'    => false,
                    'payable_type' => $intent->payable_type,
                    'payable_id'   => (int) $intent->payable_id,
                    'message'      => 'Webhook ya procesado',
                ];
            }

            if (
                $idempotencyToken !== ''
                && $intent->idempotency_token !== null
                && ! hash_equals((string) $intent->idempotency_token, $idempotencyToken)
            ) {
                Log::warning('PaymentGatewayService::confirmPaymentFromWebhook token idempotencia inválido', [
                    'transaction_id' => $transactionId,
                    'payable_type'   => $intent->payable_type,
                    'payable_id'     => $intent->payable_id,
                ]);

                return $this->failure(
                    'Token de idempotencia no coincide',
                    $intent->payable_type,
                    (int) $intent->payable_id,
                );
            }

            if ((int) $intent->amount > $amountCents) {
                Log::warning('PaymentGatewayService::confirmPaymentFromWebhook importe insuficiente', [
                    'transaction_id' => $transactionId,
                    'expected_cents' => $intent->amount,
                    'received_cents' => $amountCents,
                    'payable_type'   => $intent->payable_type,
                    'payable_id'     => $intent->payable_id,
                ]);

                return $this->failure(
                    'Importe recibido inferior al esperado',
                    $intent->payable_type,
                    (int) $intent->payable_id,
                );
            }

            $confirmed = match ($intent->payable_type) {
                Booking::class => $this->confirmBookingPayment((int) $intent->payable_id),
                LessonUser::class => $this->confirmLessonPayment((int) $intent->payable_id),
                Pedido::class => $this->confirmPedidoPayment((int) $intent->payable_id),
                UserBono::class => $this->confirmUserBonoPayment((int) $intent->payable_id),
                PagoCuota::class => $this->confirmPagoCuotaPayment((int) $intent->payable_id),
                Auction::class => $this->confirmAuctionPayment((int) $intent->payable_id),
                PhotoSessionBooking::class => $this->confirmPhotoBookingPayment((int) $intent->payable_id),
                default => $this->confirmGenericPayment($intent->payable_type, (int) $intent->payable_id),
            };

            if (! $confirmed) {
                $classified = $this->classifyUnconfirmablePayable(
                    (string) $intent->payable_type,
                    (int) $intent->payable_id,
                );

                Log::error('PaymentGatewayService::confirmPaymentFromWebhook payable no confirmable', [
                    'transaction_id' => $transactionId,
                    'payable_type'   => $intent->payable_type,
                    'payable_id'     => $intent->payable_id,
                    'reason'         => $classified['reason'],
                    'retryable'      => $classified['retryable'],
                ]);

                return $this->failure(
                    $classified['message'],
                    $intent->payable_type,
                    (int) $intent->payable_id,
                    retryable: $classified['retryable'],
                    reason: $classified['reason'],
                );
            }

            $intent->update([
                'status' => 'processed',
                'amount' => $amountCents,
            ]);

            Log::info('PaymentGatewayService::confirmPaymentFromWebhook OK', [
                'transaction_id' => $transactionId,
                'payable_type'   => $intent->payable_type,
                'payable_id'     => $intent->payable_id,
                'amount_cents'   => $amountCents,
            ]);

            return [
                'ok'           => true,
                'duplicate'    => false,
                'retryable'    => false,
                'payable_type' => $intent->payable_type,
                'payable_id'   => (int) $intent->payable_id,
                'message'      => 'Pago confirmado',
            ];
        });
    }

    private function confirmBookingPayment(int $bookingId): bool
    {
        $booking = Booking::query()->whereKey($bookingId)->lockForUpdate()->first();
        if ($booking === null) {
            return false;
        }

        if ($booking->payment_status === PaymentStatus::Confirmed->value) {
            return true;
        }

        // Stripe solo cobra el depósito (30 % por defecto): si no cubre el
        // total, queda un resto pendiente de cobrar en mostrador.
        $remaining = round(((float) $booking->total_price) - ((float) $booking->deposit_amount), 2);

        $booking->update([
            'payment_status' => PaymentStatus::Confirmed->value,
            'status'         => Booking::STATUS_CONFIRMED,
            'reviewed_at'    => BusinessDateTime::now(),
            'balance_status' => $remaining > 0.01 ? Booking::BALANCE_PENDING : Booking::BALANCE_NONE,
        ]);

        return true;
    }

    private function confirmLessonPayment(int $enrollmentId): bool
    {
        $enrollment = LessonUser::query()->with('lesson')->whereKey($enrollmentId)->lockForUpdate()->first();
        if ($enrollment === null) {
            return false;
        }

        if ($enrollment->payment_status === PaymentStatus::Confirmed->value) {
            return true;
        }

        // Cupo extra: el cobro no salta la aprobación. El admin sigue pudiendo denegar.
        if ($enrollment->status === LessonUser::STATUS_PENDING_EXTRA_MONITOR) {
            $enrollment->update([
                'payment_status' => PaymentStatus::Confirmed->value,
            ]);

            return true;
        }

        // La particular solo cobra una señal online: si no cubre el total de la
        // clase, el resto queda pendiente de cobrar en mostrador. Las grupales
        // pagan el importe íntegro y no dejan señal registrada.
        $hasDeposit = (int) ($enrollment->deposit_amount_cents ?? 0) > 0;
        $remainingCents = $enrollment->remainingBalanceCents();

        $enrollment->update([
            'payment_status' => PaymentStatus::Confirmed->value,
            'status'         => LessonUser::STATUS_CONFIRMED,
            'confirmed_at'   => BusinessDateTime::now(),
            'balance_status' => $hasDeposit && $remainingCents > 0
                ? LessonUser::BALANCE_PENDING
                : LessonUser::BALANCE_NONE,
        ]);

        return true;
    }

    private function confirmPedidoPayment(int $pedidoId): bool
    {
        $pedido = Pedido::query()->whereKey($pedidoId)->lockForUpdate()->first();
        if ($pedido === null) {
            return false;
        }

        if ((bool) $pedido->pagado === true) {
            if ($pedido->payment_method === null || $pedido->payment_method === '') {
                $pedido->update(['payment_method' => 'card']);
            }

            return true;
        }

        $pedido->update([
            'pagado' => true,
            'payment_method' => $pedido->payment_method ?: 'card',
        ]);

        return true;
    }

    private function confirmUserBonoPayment(int $userBonoId): bool
    {
        try {
            $bono = UserBono::query()->whereKey($userBonoId)->lockForUpdate()->first();
            if ($bono === null) {
                return false;
            }

            if ($bono->status === UserBono::STATUS_CONFIRMED) {
                return true;
            }

            $this->bonoService->confirmBono($userBonoId);

            return true;
        } catch (Throwable $e) {
            Log::error('PaymentGatewayService::confirmUserBonoPayment error', [
                'user_bono_id' => $userBonoId,
                'error'        => $e->getMessage(),
            ]);

            return false;
        }
    }

    private function confirmPagoCuotaPayment(int $pagoId): bool
    {
        try {
            return $this->taquillaService->confirmPaymentFromGateway($pagoId);
        } catch (Throwable $e) {
            Log::error('PaymentGatewayService::confirmPagoCuotaPayment error', [
                'pago_id' => $pagoId,
                'error'   => $e->getMessage(),
            ]);

            return false;
        }
    }

    private function confirmPhotoBookingPayment(int $bookingId): bool
    {
        try {
            $booking = PhotoSessionBooking::query()->find($bookingId);
            if ($booking === null) {
                return false;
            }

            app(ConfirmPhotoBookingPaymentAction::class)->execute($booking, 'card');

            return true;
        } catch (Throwable $e) {
            Log::error('PaymentGatewayService::confirmPhotoBookingPayment error', [
                'booking_id' => $bookingId,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    private function confirmAuctionPayment(int $auctionId): bool
    {
        try {
            return app(AuctionSettlementService::class)->confirmPayment($auctionId);
        } catch (Throwable $e) {
            Log::error('PaymentGatewayService::confirmAuctionPayment error', [
                'auction_id' => $auctionId,
                'error'      => $e->getMessage(),
            ]);

            return false;
        }
    }

    private function confirmGenericPayment(string $payableType, int $payableId): bool
    {
        try {
            /** @var \Illuminate\Database\Eloquent\Model|null $model */
            $model = $payableType::query()->whereKey($payableId)->lockForUpdate()->first();

            if ($model === null) {
                return false;
            }

            $currentStatus = $model->getAttribute('payment_status');
            if ($currentStatus === PaymentStatus::Confirmed->value) {
                return true;
            }

            $attributes = [];
            $fillable   = $model->getFillable();

            if (in_array('payment_status', $fillable, true)) {
                $attributes['payment_status'] = PaymentStatus::Confirmed->value;
            }

            if (in_array('reviewed_at', $fillable, true)) {
                $attributes['reviewed_at'] = BusinessDateTime::now();
            }

            if ($attributes !== []) {
                $model->update($attributes);
            }

            return true;
        } catch (Throwable $e) {
            Log::error('PaymentGatewayService::confirmGenericPayment error', [
                'payable_type' => $payableType,
                'payable_id'   => $payableId,
                'error'        => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Reembolso Stripe del cobro original: sesión `cs_…` → PaymentIntent, o
     * `payment_receipts.stripe_payment_intent_id`. No crea un Checkout nuevo.
     */
    public function refundOriginalCheckout(string $payableType, int $payableId): bool
    {
        $paymentIntentId = $this->resolveOriginalPaymentIntentId($payableType, $payableId);
        if ($paymentIntentId === null) {
            Log::error('PaymentGatewayService::refundOriginalCheckout sin PaymentIntent', [
                'payable_type' => $payableType,
                'payable_id'   => $payableId,
            ]);

            return false;
        }

        try {
            $this->stripe()->refunds->create(['payment_intent' => $paymentIntentId]);
        } catch (ApiErrorException $e) {
            Log::error('PaymentGatewayService::refundOriginalCheckout Stripe API error', [
                'payable_type'       => $payableType,
                'payable_id'         => $payableId,
                'payment_intent_id'  => $paymentIntentId,
                'message'            => $e->getMessage(),
            ]);

            return false;
        }

        return true;
    }

    private function resolveOriginalPaymentIntentId(string $payableType, int $payableId): ?string
    {
        $intent = PaymentWebhookIdempotency::query()
            ->where('payable_type', $payableType)
            ->where('payable_id', $payableId)
            ->orderByDesc('id')
            ->first();

        if ($intent !== null) {
            $sessionId = trim((string) $intent->transaction_id);
            if ($sessionId !== '') {
                try {
                    $session = $this->stripe()->checkout->sessions->retrieve($sessionId, [
                        'expand' => ['payment_intent'],
                    ]);
                    $pi = $session->payment_intent ?? null;
                    $id = is_object($pi) ? (string) ($pi->id ?? '') : (string) $pi;
                    if ($id !== '') {
                        return $id;
                    }
                } catch (Throwable $e) {
                    Log::warning('PaymentGatewayService: sesión Stripe no recuperable al reembolsar', [
                        'session_id' => $sessionId,
                        'error'      => $e->getMessage(),
                    ]);
                }
            }
        }

        $receipt = PaymentReceipt::query()
            ->forPayable($payableType, $payableId)
            ->whereNotNull('stripe_payment_intent_id')
            ->orderByDesc('id')
            ->first();

        $fromReceipt = trim((string) ($receipt?->stripe_payment_intent_id ?? ''));

        return $fromReceipt !== '' ? $fromReceipt : null;
    }

    /**
     * Stripe Checkout solo admite expires_at entre 30 min y 24 h desde ahora.
     *
     * @return array{retryable: bool, reason: string, message: string}
     */
    private function classifyUnconfirmablePayable(string $payableType, int $payableId): array
    {
        if ($payableType === '' || $payableId <= 0) {
            return [
                'retryable' => false,
                'reason'    => 'deleted',
                'message'   => 'Payable no encontrado',
            ];
        }

        try {
            /** @var \Illuminate\Database\Eloquent\Model|null $model */
            $model = $payableType::query()->whereKey($payableId)->first();
        } catch (Throwable) {
            return [
                'retryable' => true,
                'reason'    => 'transient',
                'message'   => 'No se pudo confirmar el payable',
            ];
        }

        if ($model === null) {
            return [
                'retryable' => false,
                'reason'    => 'deleted',
                'message'   => 'Payable eliminado',
            ];
        }

        $status = (string) ($model->getAttribute('status') ?? '');
        $payment = (string) ($model->getAttribute('payment_status') ?? '');
        $terminal = [
            'cancelled',
            'rejected',
            'refunded',
            'cancelled_free',
            'cancelled_late_lost',
        ];

        if (in_array($status, $terminal, true) || $payment === 'rejected') {
            $reason = ($status === 'rejected' || $payment === 'rejected') ? 'rejected' : 'cancelled';

            return [
                'retryable' => false,
                'reason'    => $reason,
                'message'   => 'Payable en estado terminal',
            ];
        }

        return [
            'retryable' => true,
            'reason'    => 'transient',
            'message'   => 'No se pudo confirmar el payable',
        ];
    }

    private function stripeExpiresAtTimestamp(?DateTimeInterface $wanted): ?int
    {
        if ($wanted === null) {
            return null;
        }

        $now = time();
        $min = $now + (30 * 60);
        $max = $now + (24 * 60 * 60);
        $ts = $wanted->getTimestamp();

        return max($min, min($max, $ts));
    }

    /**
     * @param bool $retryable Si el fallo puede resolverse solo, el webhook debe responder 5xx
     *                        para que Stripe reintente. Si no, reintentar solo genera ruido.
     * @return array{ok: bool, duplicate: bool, retryable: bool, payable_type: string, payable_id: int, message: string, reason?: string}
     */
    private function failure(
        string $message,
        string $payableType = '',
        int $payableId = 0,
        bool $retryable = false,
        string $reason = '',
    ): array {
        $out = [
            'ok'           => false,
            'duplicate'    => false,
            'retryable'    => $retryable,
            'payable_type' => $payableType,
            'payable_id'   => $payableId,
            'message'      => $message,
        ];
        if ($reason !== '') {
            $out['reason'] = $reason;
        }

        return $out;
    }
}
