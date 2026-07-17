<?php

declare(strict_types=1);

namespace App\DTOs\Invoicing;

/** Página paginada de "Mis facturas" — salida de ClientFiscalInvoiceListService. */
final readonly class ClientFiscalInvoiceListPageDto
{
    /**
     * @param  list<ClientFiscalInvoiceRowDto>  $items
     * @param  list<ClientFiscalInvoiceCategoryOptionDto>  $categories
     */
    public function __construct(
        public array $items,
        public array $categories,
        public string $selectedCategory,
        public int $currentPage,
        public int $lastPage,
        public int $total,
        public int $perPage,
    ) {}

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'items' => array_map(fn (ClientFiscalInvoiceRowDto $item): array => $item->toArray(), $this->items),
            'categories' => array_map(fn (ClientFiscalInvoiceCategoryOptionDto $c): array => $c->toArray(), $this->categories),
            'selected_category' => $this->selectedCategory,
            'meta' => [
                'current_page' => $this->currentPage,
                'last_page' => $this->lastPage,
                'total' => $this->total,
                'per_page' => $this->perPage,
            ],
        ];
    }
}
