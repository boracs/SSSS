<?php

declare(strict_types=1);

namespace App\Services\Rentals;

use App\DTOs\Rentals\RentalTariffRowDto;
use App\DTOs\Rentals\RentalTariffTableDto;
use App\Models\PriceSchema;
use App\Models\Surfboard;
use App\Support\MoneyCents;

/**
 * Tabla pública de tarifas: lee los tres esquemas canónicos y expone sus packs
 * en céntimos. Única fuente de los precios que se pintan en /tablas-alquiler.
 */
final class RentalTariffTableService
{
    public function __construct(
        private readonly RentalPolicyService $policy,
    ) {}

    public function build(): RentalTariffTableDto
    {
        $schemas = PriceSchema::query()
            ->whereIn('name', array_values(PriceSchema::NAME_BY_CATEGORY))
            ->get()
            ->keyBy('name');

        $rows = [];

        foreach (PriceSchema::NAME_BY_CATEGORY as $category => $schemaName) {
            $schema = $schemas->get($schemaName);
            if ($schema === null) {
                continue;
            }

            $rows[] = new RentalTariffRowDto(
                category: $category,
                label: Surfboard::categoryLabel($category),
                prices: $this->pricesInCents($schema),
            );
        }

        return new RentalTariffTableDto(
            hourColumns: array_values(PriceSchema::MINUTE_PACKS),
            dayColumns: array_values(PriceSchema::DAY_PACKS),
            rows: $rows,
            notes: $this->policy->current()->notes,
        );
    }

    /**
     * Un pack sin precio (0 o nulo) no se oferta: viaja como null para que la
     * UI pinte «—» en vez de un 0,00 € engañoso.
     *
     * @return array<string, int|null>
     */
    private function pricesInCents(PriceSchema $schema): array
    {
        $prices = [];

        foreach ([...PriceSchema::MINUTE_PACKS, ...PriceSchema::DAY_PACKS] as $column) {
            $cents = MoneyCents::eurosToCents((float) $schema->{$column});
            $prices[$column] = $cents > 0 ? $cents : null;
        }

        return $prices;
    }
}
