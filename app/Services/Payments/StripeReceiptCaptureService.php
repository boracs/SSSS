<?php

declare(strict_types=1);

namespace App\Services\Payments;

use App\Models\PaymentReceipt;
use Illuminate\Support\Facades\Log;
use Stripe\Exception\ApiErrorException;
use Stripe\StripeClient;
use Throwable;

/**
 * Obtiene el recibo de Stripe tras un checkout.session.completed y lo persiste.
 */
final class StripeReceiptCaptureService
{
    private ?StripeClient $stripe = null;

    public function capture(string $stripeSessionId, string $payableType, int $payableId): ?PaymentReceipt
    {
        $stripeSessionId = trim($stripeSessionId);
        if ($stripeSessionId === '') {
            return null;
        }

        $existing = PaymentReceipt::query()
            ->where('stripe_checkout_session_id', $stripeSessionId)
            ->first();

        if ($existing !== null) {
            return $existing;
        }

        $existingForPayable = PaymentReceipt::query()
            ->forPayable($payableType, $payableId)
            ->first();

        if ($existingForPayable !== null) {
            return $existingForPayable;
        }

        try {
            $session = $this->stripe()->checkout->sessions->retrieve($stripeSessionId, [
                'expand' => ['payment_intent.latest_charge'],
            ]);
        } catch (ApiErrorException $e) {
            Log::error('StripeReceiptCaptureService: no se pudo recuperar la sesión', [
                'session_id'   => $stripeSessionId,
                'payable_type' => $payableType,
                'payable_id'   => $payableId,
                'error'        => $e->getMessage(),
            ]);

            return null;
        } catch (Throwable $e) {
            Log::error('StripeReceiptCaptureService: error inesperado al recuperar sesión', [
                'session_id' => $stripeSessionId,
                'error'      => $e->getMessage(),
            ]);

            return null;
        }

        $paymentIntentId = null;
        $receiptUrl = null;

        $paymentIntent = $session->payment_intent ?? null;
        if (is_string($paymentIntent)) {
            $paymentIntentId = $paymentIntent;
            try {
                $pi = $this->stripe()->paymentIntents->retrieve($paymentIntentId, [
                    'expand' => ['latest_charge'],
                ]);
                $paymentIntent = $pi;
            } catch (Throwable $e) {
                Log::warning('StripeReceiptCaptureService: payment_intent no recuperable', [
                    'payment_intent_id' => $paymentIntentId,
                    'error'             => $e->getMessage(),
                ]);
            }
        }

        if (is_object($paymentIntent)) {
            $paymentIntentId = (string) ($paymentIntent->id ?? $paymentIntentId);
            $charge = $paymentIntent->latest_charge ?? null;

            if (is_string($charge) && $charge !== '') {
                try {
                    $charge = $this->stripe()->charges->retrieve($charge);
                } catch (Throwable $e) {
                    Log::warning('StripeReceiptCaptureService: charge no recuperable', [
                        'charge_id' => $charge,
                        'error'     => $e->getMessage(),
                    ]);
                    $charge = null;
                }
            }

            if (is_object($charge)) {
                $receiptUrl = is_string($charge->receipt_url ?? null) ? $charge->receipt_url : null;
            }
        }

        if ($receiptUrl === null || $receiptUrl === '') {
            Log::warning('StripeReceiptCaptureService: sesión sin receipt_url', [
                'session_id'        => $stripeSessionId,
                'payable_type'      => $payableType,
                'payable_id'        => $payableId,
                'payment_intent_id' => $paymentIntentId,
            ]);

            return null;
        }

        return PaymentReceipt::query()->create([
            'payable_type'                => $payableType,
            'payable_id'                  => $payableId,
            'stripe_checkout_session_id'  => $stripeSessionId,
            'stripe_payment_intent_id'    => $paymentIntentId,
            'receipt_url'                 => $receiptUrl,
            'captured_at'                 => now(),
        ]);
    }

    private function stripe(): StripeClient
    {
        if ($this->stripe !== null) {
            return $this->stripe;
        }

        $secret = config('services.stripe.secret');
        if (! is_string($secret) || trim($secret) === '') {
            throw new \RuntimeException('Stripe no está configurado.');
        }

        $this->stripe = new StripeClient($secret);

        return $this->stripe;
    }
}
