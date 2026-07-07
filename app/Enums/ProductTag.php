<?php

declare(strict_types=1);

namespace App\Enums;

enum ProductTag: string
{
    case INVIERNO = 'invierno';
    case NEOPRENO = 'neopreno';
    case MATERIAL_SURF = 'material_surf';
    case BANADORES = 'banadores';
    case CAMISETAS = 'camisetas';
    case PANTALONES = 'pantalones';
    case CALZADO = 'calzado';
    case TABLAS = 'tablas';
    case HERRAMIENTAS = 'herramientas';
    case PRODUCTOS_ESPECIALES = 'productos_especiales';

    public function label(): string
    {
        return match ($this) {
            self::INVIERNO => 'Invierno',
            self::NEOPRENO => 'Neopreno',
            self::MATERIAL_SURF => 'Material de surf',
            self::BANADORES => 'Bañadores',
            self::CAMISETAS => 'Camisetas',
            self::PANTALONES => 'Pantalones',
            self::CALZADO => 'Calzado',
            self::TABLAS => 'Tablas',
            self::HERRAMIENTAS => 'Herramientas',
            self::PRODUCTOS_ESPECIALES => 'Productos especiales',
        };
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(static fn (self $tag) => $tag->value, self::cases());
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    public static function optionsForFrontend(): array
    {
        return array_map(
            static fn (self $tag) => ['value' => $tag->value, 'label' => $tag->label()],
            self::cases()
        );
    }

    /**
     * @param  list<string|null>|null  $raw
     * @return list<string>
     */
    public static function normalize(?array $raw): array
    {
        if ($raw === null || $raw === []) {
            return [];
        }

        $allowed = array_flip(self::values());
        $normalized = [];

        foreach ($raw as $item) {
            if (! is_string($item)) {
                continue;
            }

            $slug = trim($item);
            if ($slug === '' || ! isset($allowed[$slug])) {
                continue;
            }

            $normalized[$slug] = true;
        }

        $values = array_keys($normalized);
        sort($values);

        return $values;
    }

    /**
     * @param  list<string>  $slugs
     * @return list<string>
     */
    public static function labelsFor(array $slugs): array
    {
        return array_values(array_filter(array_map(static function (string $slug): ?string {
            return self::tryFrom($slug)?->label();
        }, $slugs)));
    }
}
