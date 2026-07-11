<?php

declare(strict_types=1);

namespace App\Http\Controllers\Payments;

use App\Events\Payments\PaymentConfirmed;
use App\Http\Controllers\Controller;
use App\Services\Payments\PaymentGatewayService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;
use Stripe\Exception\SignatureVerificationException;
use Stripe\Webhook;
use Throwable;

/**
 * Recibe y verifica los webhooks de Stripe.
 *
 * Excluido de VerifyCsrfToken (bootstrap/app.php).
 */
final class PaymentWebhookController extends Controller
{
    public function __construct(
        private readonly PaymentGatewayService $gateway,
    ) {}

    public function handle(Request $request): Response
    {
        $secret = (string) config('services.stripe.webhook_secret');
        $payload = $request->getContent();
        $signature = $request->header('Stripe-Signature', '');

        try {
            $event = Webhook::constructEvent($payload, $signature, $secret);
        } catch (SignatureVerificationException $e) {
            Log::warning('PaymentWebhookController firma inválida', [
                'error' => $e->getMessage(),
                'ip'    => $request->ip(),
            ]);

            return response('Firma inválida', 400);
        } catch (Throwable $e) {
            Log::error('PaymentWebhookController error al parsear webhook', [
                'error' => $e->getMessage(),
                'ip'    => $request->ip(),
            ]);

            return response('Webhook inválido', 400);
        }

        Log::withContext([
            'stripe_event_id'   => $event->id,
            'stripe_event_type' => $event->type,
        ]);

        if ($event->type !== 'checkout.session.completed') {
            return response('Evento ignorado', 200);
        }

        /** @var \Stripe\Checkout\Session $session */
        $session = $event->data->object;

        $sessionId        = (string) $session->id;
        $amountCents      = (int) ($session->amount_total ?? 0);
        $idempotencyToken = (string) ($session->metadata['idempotency_token'] ?? '');

        Log::withContext([
            'payable_type'       => (string) ($session->metadata['payable_type'] ?? ''),
            'payable_id'         => (string) ($session->metadata['payable_id'] ?? ''),
            'idempotency_token'  => $idempotencyToken,
            'stripe_session_id'  => $sessionId,
        ]);

        $result = $this->gateway->confirmPaymentFromWebhook(
            transactionId: $sessionId,
            amountCents: $amountCents,
            idempotencyToken: $idempotencyToken,
        );

        if (! $result['ok']) {
            Log::error('PaymentWebhookController confirmación fallida', [
                'session_id' => $sessionId,
                'result'     => $result,
            ]);

            return response('Confirmación fallida — ver logs', 200);
        }

        if (! $result['duplicate']) {
            try {
                PaymentConfirmed::dispatch(
                    payableType: $result['payable_type'],
                    payableId: $result['payable_id'],
                    amountCents: $amountCents,
                    stripeSessionId: $sessionId,
                );
            } catch (Throwable $e) {
                Log::error('PaymentWebhookController listener PaymentConfirmed falló (pago ya confirmado en DB)', [
                    'payable_type' => $result['payable_type'],
                    'payable_id'   => $result['payable_id'],
                    'session_id'   => $sessionId,
                    'error'        => $e->getMessage(),
                ]);
            }
        }

        return response('OK', 200);
    }
}
