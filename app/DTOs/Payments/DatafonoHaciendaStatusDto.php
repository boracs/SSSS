<?php

declare(strict_types=1);

namespace App\DTOs\Payments;

/**
 * Estado fiscal (Hacienda / TicketBAI) de un cobro de datáfono en el listado admin.
 */
final readonly class DatafonoHaciendaStatusDto
{
    public function __construct(
        public string $code,
        public string $label,
        public bool $canCommunicate,
        public ?string $detailUrl,
    ) {}

    /** @return array{code: string, label: string, can_communicate: bool, detail_url: ?string} */
    public function toArray(): array
    {
        return [
            'code' => $this->code,
            'label' => $this->label,
            'can_communicate' => $this->canCommunicate,
            'detail_url' => $this->detailUrl,
        ];
    }
}
