<?php

namespace Database\Seeders;

use App\Enums\ProductTag;
use App\Models\Producto;
use Illuminate\Database\Seeder;

/**
 * Asigna tags de demo a productos existentes sin categoría.
 */
class ProductTagsSeeder extends Seeder
{
    public function run(): void
    {
        $allTags = ProductTag::values();
        $assignments = [
            'neopreno' => [ProductTag::NEOPRENO->value, ProductTag::INVIERNO->value],
            'bota' => [ProductTag::CALZADO->value, ProductTag::NEOPRENO->value],
            'sudadera' => [ProductTag::CAMISETAS->value, ProductTag::INVIERNO->value],
            'camiseta' => [ProductTag::CAMISETAS->value],
            'bañador' => [ProductTag::BANADORES->value],
            'banador' => [ProductTag::BANADORES->value],
            'pantalon' => [ProductTag::PANTALONES->value],
            'tabla' => [ProductTag::TABLAS->value, ProductTag::MATERIAL_SURF->value],
            'cera' => [ProductTag::MATERIAL_SURF->value],
            'leash' => [ProductTag::MATERIAL_SURF->value],
            'quillas' => [ProductTag::MATERIAL_SURF->value, ProductTag::HERRAMIENTAS->value],
        ];

        Producto::query()->each(function (Producto $producto) use ($allTags, $assignments): void {
            if ($producto->normalizedTags() !== []) {
                return;
            }

            $nombre = mb_strtolower((string) $producto->nombre);
            $matched = null;

            foreach ($assignments as $needle => $tags) {
                if (str_contains($nombre, $needle)) {
                    $matched = $tags;
                    break;
                }
            }

            $producto->syncTags($matched ?? fake()->randomElements($allTags, fake()->numberBetween(1, 2)));
            $producto->save();
        });
    }
}
