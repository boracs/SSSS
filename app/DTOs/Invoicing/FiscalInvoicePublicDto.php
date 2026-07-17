<?php

declare(strict_types=1);

namespace App\DTOs\Invoicing;

use App\Enums\FiscalInvoiceStatus;

/**
 * Vista pública (cliente) de una factura fiscal TicketBAI.
 * Sin secrets ni IDs internos de B2BRouter innecesarios.
 */
final readonly class FiscalInvoicePublicDto
{
    public function __construct(
        public int $id,
        public FiscalInvoiceStatus $status,
        public string $statusLabel,
        public int $amountCents,
        public ?string $tbaiIdentifier,
        public ?string $qrImageSrc,
        public string $detailUrl,
        public ?string $pdfUrl,
        public bool $isReady,
    ) {}

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'status' => $this->status->value,
            'status_label' => $this->statusLabel,
            'amount_cents' => $this->amountCents,
            'tbai_identifier' => $this->tbaiIdentifier,
            'qr_image_src' => $this->qrImageSrc,
            'detail_url' => $this->detailUrl,
            'pdf_url' => $this->pdfUrl,
            'is_ready' => $this->isReady,
        ];
    }
}
