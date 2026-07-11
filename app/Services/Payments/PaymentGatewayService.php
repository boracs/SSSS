<?php

declare(strict_types=1);

namespace App\Services\Payments;

use App\DTOs\Payments\CheckoutSessionResultDto;
use App\DTOs\Payments\InitiatePaymentDto;
use App\Enums\PaymentStatus;
use App\Models\Booking;
use App\Models\LessonUser;
use App\Models\PagoCuota;
use App\Models\Pedido;
use App\Models\PaymentWebhookIdempotency;
use App\Models\UserBono;
use App\Services\BonoService;
use App\Services\Taquilla\TaquillaMembershipService;
use App\Support\BusinessDateTime;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Stripe\Exception\ApiErrorException;
use Stripe\StripeClient;
use Throwable;

/**
 * Orquestador de pagos (Stripe Checkout) con idempotencia de webhooks.
 */
final class PaymentGatewayService
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

        try {
            $session = $this->stripe()->checkout->sessions->create([
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
                    'payable_type'       => $dto->payableType,
                    'payable_id'         => (string) $dto->payableId,
                    'idempotency_token'  => $idempotencyToken,
                ]),
            ]);
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

        $this->registerPaymentIntent(
            transactionId: $sessionId,
            payableType: $dto->payableType,
            payableId: $dto->payableId,
            expectedAmountCents: $totalCents,
            idempotencyToken: $idempotencyToken,
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
    ): PaymentWebhookIdempotency {
        $transactionId = trim($transactionId);
        if ($transactionId === '') {
            throw new \InvalidArgumentException('transaction_id vacío');
        }

        return DB::transaction(function () use ($transactionId, $payableType, $payableId, $expectedAmountCents, $idempotencyToken) {
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
                'payable_type'       => $payableType,
                'payable_id'         => $payableId,
                'amount'             => $expectedAmountCents,
                'status'             => 'pending',
            ]);
        });
    }

    /**
     * Confirma reserva/pedido tras webhook exitoso de Stripe.
     *
     * @return array{ok: bool, duplicate: bool, payable_type: string, payable_id: int, message: string}
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
                Booking::class    => $this->confirmBookingPayment((int) $intent->payable_id),
                LessonUser::class => $this->confirmLessonPayment((int) $intent->payable_id),
                Pedido::class     => $this->confirmPedidoPayment((int) $intent->payable_id),
                UserBono::class   => $this->confirmUserBonoPayment((int) $intent->payable_id),
                PagoCuota::class  => $this->confirmPagoCuotaPayment((int) $intent->payable_id),
                default           => $this->confirmGenericPayment($intent->payable_type, (int) $intent->payable_id),
            };

            if (! $confirmed) {
                Log::error('PaymentGatewayService::confirmPaymentFromWebhook payable no confirmable', [
                    'transaction_id' => $transactionId,
                    'payable_type'   => $intent->payable_type,
                    'payable_id'     => $intent->payable_id,
                ]);

                return $this->failure('No se pudo confirmar el payable', $intent->payable_type, (int) $intent->payable_id);
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

        $booking->update([
            'payment_status' => PaymentStatus::Confirmed->value,
            'status'         => Booking::STATUS_CONFIRMED,
            'reviewed_at'    => BusinessDateTime::now(),
        ]);

        return true;
    }

    private function confirmLessonPayment(int $enrollmentId): bool
    {
        $enrollment = LessonUser::query()->whereKey($enrollmentId)->lockForUpdate()->first();
        if ($enrollment === null) {
            return false;
        }

        if ($enrollment->payment_status === PaymentStatus::Confirmed->value) {
            return true;
        }

        $enrollment->update([
            'payment_status' => PaymentStatus::Confirmed->value,
            'status'         => LessonUser::STATUS_CONFIRMED,
            'confirmed_at'   => BusinessDateTime::now(),
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
            return true;
        }

        $pedido->update(['pagado' => true]);

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

    /** @return array{ok: bool, duplicate: bool, payable_type: string, payable_id: int, message: string} */
    private function failure(string $message, string $payableType = '', int $payableId = 0): array
    {
        return [
            'ok'           => false,
            'duplicate'    => false,
            'payable_type' => $payableType,
            'payable_id'   => $payableId,
            'message'      => $message,
        ];
    }
}
