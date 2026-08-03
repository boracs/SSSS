<?php

declare(strict_types=1);

namespace App\DTOs\Rentals;

/**
 * Fila de la tabla pública de tarifas: una categoría de tabla y sus packs.
 */
final readonly class RentalTariffRowDto
{
    /**
     * @param  array<string, int|null>  $prices  columna del pack => precio en céntimos (null = no ofertado)
     */
    public function __construct(
        public string $category,
        public string $label,
        public array $prices,
    ) {}

    /**
     * @return array{category: string, label: string, prices: array<string, int|null>}
     */
    public function toArray(): array
    {
        return [
            'category' => $this->category,
            'label' => $this->label,
            'prices' => $this->prices,
        ];
    }
}
