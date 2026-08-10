<?php

declare(strict_types=1);

namespace App\Http\Controllers\Payments;

use App\DTOs\Payments\TpvPaymentIngestDto;
use App\Http\Controllers\Controller;
use App\Services\Payments\DatafonoPaymentReconciliationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;
use Throwable;

/**
 * Recibe la ingesta firmada de cobros TPV (Kutxabank u otro datáfono) y los registra
 * en el ledger `datafono_payments` como `source=tpv`, pendientes de asignar.
 *
 * Firma propia HMAC-SHA256 (config('services.datafono.ingest_secret')), NO Stripe.
 * Excluido de VerifyCsrfToken (bootstrap/app.php).
 */
final class DatafonoIngestWebhookController extends Controller
{
    public function __construct(
        private readonly DatafonoPaymentReconciliationService $reconciliation,
    ) {}

    public function handle(Request $request): Response|JsonResponse
    {
        if (! config('services.datafono.ingest_enabled', true)) {
            Log::warning('DatafonoIngestWebhookController ingesta deshabilitada', [
                'ip' => $request->ip(),
            ]);

            return response('Ingesta deshabilitada', 503);
        }

        $payloadRaw = $request->getContent();
        $signature = (string) $request->header('X-Datafono-Signature', '');
        $secret = (string) config('services.datafono.ingest_secret');

        if ($secret === '' || $signature === '' || ! hash_equals(hash_hmac('sha256', $payloadRaw, $secret), $signature)) {
            Log::warning('DatafonoIngestWebhookController firma inválida', [
                'ip' => $request->ip(),
            ]);

            return response('Firma inválida', 401);
        }

        $payload = json_decode($payloadRaw, true);
        if (! is_array($payload)) {
            Log::warning('DatafonoIngestWebhookController payload no es JSON válido', [
                'ip' => $request->ip(),
            ]);

            return response('Payload inválido', 422);
        }

        try {
            $dto = TpvPaymentIngestDto::fromArray($payload);
        } catch (InvalidArgumentException $e) {
            Log::warning('DatafonoIngestWebhookController payload inválido', [
                'error' => $e->getMessage(),
                'ip'    => $request->ip(),
            ]);

            return response($e->getMessage(), 422);
        }

        Log::withContext([
            'datafono_external_reference' => $dto->externalReference,
            'datafono_amount_cents'       => $dto->amountCents,
            'datafono_terminal_codigo'    => $dto->terminalCodigo,
        ]);

        try {
            $payment = $this->reconciliation->ingestTpvPayment($dto);
        } catch (ValidationException $e) {
            Log::warning('DatafonoIngestWebhookController terminal no válido', [
                'errors' => $e->errors(),
            ]);

            return response()->json(['errors' => $e->errors()], 422);
        } catch (Throwable $e) {
            Log::error('DatafonoIngestWebhookController error inesperado', [
                'error' => $e->getMessage(),
            ]);

            return response('Error al procesar el cobro', 422);
        }

        Log::info('DatafonoIngestWebhookController cobro registrado', [
            'datafono_payment_id' => $payment->id,
            'status'              => $payment->status,
        ]);

        return response()->json([
            'id'     => $payment->id,
            'status' => $payment->status,
        ], 200);
    }
}
