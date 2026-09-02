<?php

declare(strict_types=1);

namespace App\Services\Invoicing;

use App\Exceptions\Invoicing\B2BRouterApiException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Cliente HTTP fino para el API REST de B2BRouter.
 *
 * Solo transporte: no conoce reglas de negocio ni construye payloads de dominio
 * (eso vive en B2BRouterFiscalInvoiceIssuer). Debe usarse SIEMPRE desde un Job
 * en cola, nunca dentro del ciclo de vida de una petición HTTP entrante.
 *
 * Docs: https://developer.b2brouter.net/docs/submit_ticketbai
 * create-invoice OpenAPI no documenta Idempotency-Key; el mismo nombre de
 * cabecera sí está documentado en POST /ledgers/import. La mandamos en el alta
 * para que un reintento con respuesta perdida no duplique TicketBAI.
 */
final class B2BRouterClient
{
    public const IDEMPOTENCY_KEY_HEADER = 'Idempotency-Key';

    /**
     * Clave estable por cobro (stripe session o equivalente datafono-*).
     * SHA-256 hex (64 chars) — B2BRouter trunca/hashea claves >64 en ledgers.
     */
    public static function idempotencyKeyForSession(string $stripeSessionId): string
    {
        $sessionId = trim($stripeSessionId);
        if ($sessionId === '') {
            throw new B2BRouterApiException(
                'No se puede emitir factura sin identificador de cobro.',
                retryable: false,
            );
        }

        return hash('sha256', 's4-tbai:'.$sessionId);
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public function createInvoice(array $payload, string $idempotencyKey): array
    {
        $accountId = $this->accountId();

        try {
            $response = $this->request($idempotencyKey)->post("/accounts/{$accountId}/invoices", $payload);
        } catch (ConnectionException $e) {
            throw new B2BRouterApiException(
                message: 'B2BRouter no respondió al crear la factura (timeout o red).',
                previous: $e,
                retryable: true,
            );
        }

        return $this->decode($response, 'crear la factura');
    }

    /**
     * @return array<string, mixed>
     */
    public function getTaxReport(string $taxReportId): array
    {
        $response = $this->request()->get("/tax_reports/{$taxReportId}");

        return $this->decode($response, 'consultar el informe fiscal');
    }

    /**
     * Descarga el PDF de la factura emitida en B2BRouter (binario).
     * Endpoint documentado en el SDK: GET /invoices/{id}/as/pdf.invoice
     */
    public function downloadInvoicePdf(string $b2bInvoiceId): string
    {
        $response = $this->request()
            ->accept('application/pdf')
            ->get("/invoices/{$b2bInvoiceId}/as/pdf.invoice");

        if ($response->failed()) {
            Log::error('B2BRouterClient: fallo al descargar PDF de factura', [
                'b2b_invoice_id' => $b2bInvoiceId,
                'status'         => $response->status(),
            ]);

            throw new B2BRouterApiException(
                message: "B2BRouter no pudo entregar el PDF de la factura (HTTP {$response->status()}).",
                retryable: B2BRouterApiException::statusIsRetryable($response->status()),
                httpStatus: $response->status(),
            );
        }

        $body = $response->body();
        if ($body === '') {
            throw new B2BRouterApiException('B2BRouter devolvió un PDF vacío.');
        }

        return $body;
    }

    private function request(?string $idempotencyKey = null): PendingRequest
    {
        $headers = [
            'X-B2B-API-Key'     => (string) config('invoicing.b2brouter.api_key'),
            'X-B2B-API-Version' => (string) config('invoicing.b2brouter.api_version'),
            'Accept'            => 'application/json',
        ];

        if ($idempotencyKey !== null && $idempotencyKey !== '') {
            $headers[self::IDEMPOTENCY_KEY_HEADER] = $idempotencyKey;
        }

        return Http::baseUrl((string) config('invoicing.b2brouter.base_url'))
            ->withHeaders($headers)
            ->timeout((int) config('invoicing.b2brouter.timeout', 15));
    }

    private function accountId(): string
    {
        $accountId = trim((string) config('invoicing.b2brouter.account_id'));

        if ($accountId === '') {
            throw new B2BRouterApiException(
                message: 'B2BROUTER_ACCOUNT_ID no está configurado.',
                retryable: false,
            );
        }

        return $accountId;
    }

    /** @return array<string, mixed> */
    private function decode(Response $response, string $action): array
    {
        if ($response->failed()) {
            Log::error("B2BRouterClient: fallo al {$action}", [
                'status' => $response->status(),
                'body'   => $response->json() ?? $response->body(),
            ]);

            throw B2BRouterApiException::fromHttpStatus($action, $response->status());
        }

        return (array) ($response->json() ?? []);
    }
}
