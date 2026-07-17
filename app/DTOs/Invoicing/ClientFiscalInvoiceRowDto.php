<?php

declare(strict_types=1);

namespace App\DTOs\Invoicing;

/** Fila de "Mis facturas" — una factura fiscal ya emitida (o en curso) del cliente. */
final readonly class ClientFiscalInvoiceRowDto
{
    public function __construct(
        public int $id,
        public string $category,
        public string $categoryLabel,
        public string $description,
        public int $amountCents,
        public string $status,
        public string $statusLabel,
        public bool $isReady,
        public string $detailUrl,
        public ?string $pdfUrl,
        public ?string $issuedAt,
        public string $createdAt,
    ) {}

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'category' => $this->category,
            'category_label' => $this->categoryLabel,
            'description' => $this->description,
            'amount_cents' => $this->amountCents,
            'status' => $this->status,
            'status_label' => $this->statusLabel,
            'is_ready' => $this->isReady,
            'detail_url' => $this->detailUrl,
            'pdf_url' => $this->pdfUrl,
            'issued_at' => $this->issuedAt,
            'created_at' => $this->createdAt,
        ];
    }
}
