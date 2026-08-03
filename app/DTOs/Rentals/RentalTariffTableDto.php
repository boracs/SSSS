<?php

declare(strict_types=1);

namespace App\DTOs\Rentals;

/**
 * Tabla pública de tarifas de alquiler: columnas = packs, filas = categorías.
 * Los precios viajan en céntimos; las etiquetas de cada pack las pone el
 * frontend (resources/js/lib/rentalPricing.js) para no duplicar textos.
 */
final readonly class RentalTariffTableDto
{
    /**
     * @param  list<string>  $hourColumns  claves de packs por horas, en orden
     * @param  list<string>  $dayColumns   claves de packs por días, en orden
     * @param  list<RentalTariffRowDto>  $rows
     * @param  list<string>  $notes
     */
    public function __construct(
        public array $hourColumns,
        public array $dayColumns,
        public array $rows,
        public array $notes,
    ) {}

    public function isEmpty(): bool
    {
        return $this->rows === [];
    }

    /**
     * @return array{
     *     hour_columns: list<string>,
     *     day_columns: list<string>,
     *     rows: list<array{category: string, label: string, prices: array<string, int|null>}>,
     *     notes: list<string>
     * }
     */
    public function toArray(): array
    {
        return [
            'hour_columns' => $this->hourColumns,
            'day_columns' => $this->dayColumns,
            'rows' => array_map(static fn (RentalTariffRowDto $row) => $row->toArray(), $this->rows),
            'notes' => $this->notes,
        ];
    }
}
