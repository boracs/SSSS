<?php

namespace Database\Seeders;

use App\Models\PriceSchema;
use App\Models\Surfboard;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Exactamente tres esquemas de alquiler (Softboards < Duras básicas < Duras pro boards).
 * Precios placeholder editables desde el admin; curva monótona en minutos y en días.
 */
class PriceSchemaSeeder extends Seeder
{
    /** @var array<string, array<string, int>> */
    private const PACKS = [
        Surfboard::CATEGORY_SOFT => [
            'price_60m' => 10,
            'price_90m' => 13,
            'price_120m' => 16,
            'price_180m' => 20,
            'price_240m' => 24,
            'price_360m' => 30,
            'price_1d' => 35,
            'price_2d' => 60,
            'price_3d' => 80,
            'price_4d' => 95,
            'price_5d' => 110,
            'price_week' => 140,
        ],
        Surfboard::CATEGORY_HARD_BASIC => [
            'price_60m' => 14,
            'price_90m' => 18,
            'price_120m' => 22,
            'price_180m' => 28,
            'price_240m' => 34,
            'price_360m' => 42,
            'price_1d' => 50,
            'price_2d' => 85,
            'price_3d' => 115,
            'price_4d' => 140,
            'price_5d' => 160,
            'price_week' => 200,
        ],
        Surfboard::CATEGORY_HARD_PRO => [
            'price_60m' => 18,
            'price_90m' => 24,
            'price_120m' => 30,
            'price_180m' => 38,
            'price_240m' => 46,
            'price_360m' => 58,
            'price_1d' => 70,
            'price_2d' => 120,
            'price_3d' => 160,
            'price_4d' => 195,
            'price_5d' => 225,
            'price_week' => 280,
        ],
    ];

    public function run(): void
    {
        $schemas = self::ensure();

        DB::transaction(function () use ($schemas) {
            $this->reassignSurfboards($schemas);
            $this->removeLegacySchemas($schemas);
        });
    }

    /**
     * Crea/actualiza los tres esquemas canónicos y los devuelve indexados por categoría.
     *
     * @return array<string, PriceSchema>
     */
    public static function ensure(): array
    {
        $schemas = [];

        foreach (self::PACKS as $category => $packs) {
            $schemas[$category] = PriceSchema::query()->updateOrCreate(
                ['name' => PriceSchema::NAME_BY_CATEGORY[$category]],
                $packs,
            );
        }

        return $schemas;
    }

    /**
     * Esquema canónico para una categoría (fallback a Softboards).
     */
    public static function schemaFor(string $category): PriceSchema
    {
        $schemas = self::ensure();

        return $schemas[$category] ?? $schemas[Surfboard::CATEGORY_SOFT];
    }

    /**
     * @param  array<string, PriceSchema>  $schemas
     */
    private function reassignSurfboards(array $schemas): void
    {
        $canonicalIds = array_map(static fn (PriceSchema $schema) => $schema->id, $schemas);

        foreach ($schemas as $category => $schema) {
            Surfboard::query()
                ->where('category', $category)
                ->where(fn ($query) => $query
                    ->whereNull('price_schema_id')
                    ->orWhereNotIn('price_schema_id', $canonicalIds))
                ->update(['price_schema_id' => $schema->id]);
        }

        // Categorías desconocidas (datos antiguos) quedan en el esquema más básico.
        Surfboard::query()
            ->whereNotIn('category', Surfboard::CATEGORIES)
            ->update(['price_schema_id' => $schemas[Surfboard::CATEGORY_SOFT]->id]);
    }

    /**
     * Borra esquemas antiguos que ya no tienen tablas (evita el cascade delete).
     *
     * @param  array<string, PriceSchema>  $schemas
     */
    private function removeLegacySchemas(array $schemas): void
    {
        PriceSchema::query()
            ->whereNotIn('id', array_map(static fn (PriceSchema $schema) => $schema->id, $schemas))
            ->whereDoesntHave('surfboards')
            ->delete();
    }
}
