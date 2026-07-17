<?php

declare(strict_types=1);

namespace App\Services\Invoicing;

use App\Contracts\Invoicing\FiscalInvoiceIssuerInterface;
use App\DTOs\Invoicing\FiscalInvoiceContactDto;
use App\DTOs\Invoicing\FiscalInvoiceDraftDto;
use App\DTOs\Invoicing\FiscalInvoiceLineDto;
use App\DTOs\Invoicing\FiscalInvoiceResultDto;
use App\DTOs\Invoicing\FiscalTaxReportStatusDto;
use App\Exceptions\Invoicing\B2BRouterApiException;
use App\Support\MoneyCents;

/**
 * Adapter B2BRouter del puerto FiscalInvoiceIssuerInterface.
 *
 * B2BRouter genera, firma (XAdES) y envía el XML TicketBAI a la Hacienda Foral;
 * este adapter solo construye el JSON de la API y traduce sus respuestas a DTOs.
 * La conversión céntimos → euros ocurre EXCLUSIVAMENTE aquí (frontera de salida).
 *
 * Referencia payload: https://developer.b2brouter.net/docs/submit_ticketbai
 */
final class B2BRouterFiscalInvoiceIssuer implements FiscalInvoiceIssuerInterface
{
    public function __construct(
        private readonly B2BRouterClient $client,
    ) {}

    public function createIssuedInvoice(FiscalInvoiceDraftDto $draft): FiscalInvoiceResultDto
    {
        $payload = [
            'send_after_import' => true,
            'invoice' => [
                'date'    => $draft->invoiceDate,
                'contact' => $this->contactPayload($draft->contact),
                'invoice_lines_attributes' => array_map(
                    fn (FiscalInvoiceLineDto $line): array => $this->linePayload($line),
                    $draft->lines,
                ),
            ],
        ];

        $response = $this->client->createInvoice($payload);
        $invoice  = (array) ($response['invoice'] ?? $response);

        $invoiceId = (string) ($invoice['id'] ?? '');
        if ($invoiceId === '') {
            throw new B2BRouterApiException('B2BRouter no devolvió el id de la factura creada.');
        }

        /** @var list<string> $taxReportIds */
        $taxReportIds = array_map('strval', (array) ($invoice['tax_report_ids'] ?? []));

        return new FiscalInvoiceResultDto(
            b2bInvoiceId: $invoiceId,
            taxReportIds: $taxReportIds,
            rawState: (string) ($invoice['state'] ?? 'issued'),
        );
    }

    public function getTaxReport(string $taxReportId): FiscalTaxReportStatusDto
    {
        $response = $this->client->getTaxReport($taxReportId);
        $report   = (array) ($response['tax_report'] ?? $response);

        return new FiscalTaxReportStatusDto(
            id: (string) ($report['id'] ?? $taxReportId),
            state: (string) ($report['state'] ?? 'processing'),
            identifier: isset($report['identifier']) ? (string) $report['identifier'] : null,
            qr: isset($report['qr']) ? (string) $report['qr'] : null,
            errorMessage: isset($report['error_message'])
                ? (string) $report['error_message']
                : (isset($report['error']) ? (string) $report['error'] : null),
        );
    }

    public function downloadInvoicePdf(string $providerInvoiceId): string
    {
        return $this->client->downloadInvoicePdf($providerInvoiceId);
    }

    /** @return array<string, mixed> */
    private function contactPayload(FiscalInvoiceContactDto $contact): array
    {
        return array_filter([
            'name'       => $contact->name,
            'email'      => $contact->email,
            'country'    => $contact->country,
            'language'   => $contact->language,
            'currency'   => $contact->currency,
            'address'    => $contact->address,
            'city'       => $contact->city,
            'province'   => $contact->province,
            'postalcode' => $contact->postalcode,
            'tin_scheme' => $contact->tinScheme,
            'tin_value'  => $contact->tinValue,
        ], static fn (mixed $value): bool => $value !== null && $value !== '');
    }

    /** @return array<string, mixed> */
    private function linePayload(FiscalInvoiceLineDto $line): array
    {
        return [
            'quantity'    => $line->quantity,
            'description' => $line->description,
            'price'       => MoneyCents::centsToEuros($line->unitPriceCents),
            'taxes_attributes' => [
                [
                    'name'     => 'IVA',
                    'percent'  => $line->vatPercent,
                    'category' => $line->vatCategory,
                ],
            ],
        ];
    }
}
