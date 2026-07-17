<?php

declare(strict_types=1);

namespace App\DTOs\Invoicing;

/** Opción de filtro por categoría en "Mis facturas" — `enabled=false` = "Próximamente". */
final readonly class ClientFiscalInvoiceCategoryOptionDto
{
    public function __construct(
        public string $value,
        public string $label,
        public bool $enabled,
    ) {}

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'value' => $this->value,
            'label' => $this->label,
            'enabled' => $this->enabled,
        ];
    }
}
