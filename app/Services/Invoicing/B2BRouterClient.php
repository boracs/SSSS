<?php

declare(strict_types=1);

namespace App\Services\Invoicing;

use App\Exceptions\Invoicing\B2BRouterApiException;
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
 */
final class B2BRouterClient
{
    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public function createInvoice(array $payload): array
    {
        $accountId = $this->accountId();

        $response = $this->request()->post("/accounts/{$accountId}/invoices", $payload);

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
                "B2BRouter no pudo entregar el PDF de la factura (HTTP {$response->status()})."
            );
        }

        $body = $response->body();
        if ($body === '') {
            throw new B2BRouterApiException('B2BRouter devolvió un PDF vacío.');
        }

        return $body;
    }

    private function request(): PendingRequest
    {
        return Http::baseUrl((string) config('invoicing.b2brouter.base_url'))
            ->withHeaders([
                'X-B2B-API-Key'     => (string) config('invoicing.b2brouter.api_key'),
                'X-B2B-API-Version' => (string) config('invoicing.b2brouter.api_version'),
                'Accept'            => 'application/json',
            ])
            ->timeout((int) config('invoicing.b2brouter.timeout', 15));
    }

    private function accountId(): string
    {
        $accountId = trim((string) config('invoicing.b2brouter.account_id'));

        if ($accountId === '') {
            throw new B2BRouterApiException('B2BROUTER_ACCOUNT_ID no está configurado.');
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

            throw new B2BRouterApiException(
                "B2BRouter respondió con error al {$action} (HTTP {$response->status()})."
            );
        }

        return (array) ($response->json() ?? []);
    }
}
