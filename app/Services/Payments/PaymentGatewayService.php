<?php

declare(strict_types=1);

namespace App\Services\Payments;

use App\Enums\PaymentStatus;
use App\Models\Booking;
use App\Models\LessonUser;
use App\Models\PaymentWebhookIdempotency;
use App\Support\BusinessDateTime;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Orquestador de confirmaciones asíncronas (Stripe / Redsys) con idempotencia.
 */
final class PaymentGatewayService
{
    /**
     * Registra intención de cobro antes de redirigir a la pasarela.
     */
    public function registerPaymentIntent(
        string $transactionId,
        string $payableType,
        int $payableId,
        float $expectedAmount,
    ): PaymentWebhookIdempotency {
        $transactionId = trim($transactionId);
        if ($transactionId === '') {
            throw new \InvalidArgumentException('transaction_id vacío');
        }

        return DB::transaction(function () use ($transactionId, $payableType, $payableId, $expectedAmount) {
            $existing = PaymentWebhookIdempotency::query()
                ->where('transaction_id', $transactionId)
                ->lockForUpdate()
                ->first();

            if ($existing !== null) {
                return $existing;
            }

            return PaymentWebhookIdempotency::query()->create([
                'transaction_id' => $transactionId,
                'payable_type' => $payableType,
                'payable_id' => $payableId,
                'amount' => $expectedAmount,
                'status' => 'pending',
            ]);
        });
    }

    /**
     * Confirma reserva tras webhook exitoso de la pasarela.
     *
     * @return array{ok: bool, duplicate: bool, payable_type: string, payable_id: int, message: string}
     */
    public function confirmPaymentFromWebhook(string $transactionId, float $amount): array
    {
        $transactionId = trim($transactionId);
        if ($transactionId === '') {
            Log::error('PaymentGatewayService::confirmPaymentFromWebhook transaction_id vacío', [
                'amount' => $amount,
            ]);

            return $this->failure('transaction_id inválido');
        }

        return DB::transaction(function () use ($transactionId, $amount) {
            $intent = PaymentWebhookIdempotency::query()
                ->where('transaction_id', $transactionId)
                ->lockForUpdate()
                ->first();

            if ($intent === null) {
                Log::error('PaymentGatewayService::confirmPaymentFromWebhook intent no registrado', [
                    'transaction_id' => $transactionId,
                    'amount' => $amount,
                ]);

                return $this->failure('Intención de pago no registrada');
            }

            if ($intent->status === 'processed') {
                Log::info('PaymentGatewayService::confirmPaymentFromWebhook duplicado', [
                    'transaction_id' => $transactionId,
                    'payable_type' => $intent->payable_type,
                    'payable_id' => $intent->payable_id,
                ]);

                return [
                    'ok' => true,
                    'duplicate' => true,
                    'payable_type' => $intent->payable_type,
                    'payable_id' => (int) $intent->payable_id,
                    'message' => 'Webhook ya procesado',
                ];
            }

            if (round((float) $intent->amount, 2) > round($amount, 2)) {
                Log::warning('PaymentGatewayService::confirmPaymentFromWebhook importe insuficiente', [
                    'transaction_id' => $transactionId,
                    'expected' => $intent->amount,
                    'received' => $amount,
                    'payable_type' => $intent->payable_type,
                    'payable_id' => $intent->payable_id,
                ]);

                return $this->failure('Importe recibido inferior al esperado', $intent->payable_type, (int) $intent->payable_id);
            }

            $confirmed = match ($intent->payable_type) {
                Booking::class => $this->confirmBookingPayment((int) $intent->payable_id),
                LessonUser::class => $this->confirmLessonPayment((int) $intent->payable_id),
                default => false,
            };

            if (! $confirmed) {
                Log::error('PaymentGatewayService::confirmPaymentFromWebhook payable no confirmable', [
                    'transaction_id' => $transactionId,
                    'payable_type' => $intent->payable_type,
                    'payable_id' => $intent->payable_id,
                ]);

                return $this->failure('No se pudo confirmar el payable', $intent->payable_type, (int) $intent->payable_id);
            }

            $intent->update([
                'status' => 'processed',
                'amount' => $amount,
            ]);

            Log::info('PaymentGatewayService::confirmPaymentFromWebhook OK', [
                'transaction_id' => $transactionId,
                'payable_type' => $intent->payable_type,
                'payable_id' => $intent->payable_id,
                'amount' => $amount,
            ]);

            return [
                'ok' => true,
                'duplicate' => false,
                'payable_type' => $intent->payable_type,
                'payable_id' => (int) $intent->payable_id,
                'message' => 'Pago confirmado',
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
            'status' => Booking::STATUS_CONFIRMED,
            'reviewed_at' => BusinessDateTime::now(),
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
            'status' => LessonUser::STATUS_CONFIRMED,
            'confirmed_at' => BusinessDateTime::now(),
        ]);

        return true;
    }

    /**
     * @return array{ok: bool, duplicate: bool, payable_type: string, payable_id: int, message: string}
     */
    private function failure(string $message, string $payableType = '', int $payableId = 0): array
    {
        return [
            'ok' => false,
            'duplicate' => false,
            'payable_type' => $payableType,
            'payable_id' => $payableId,
            'message' => $message,
        ];
    }
}
