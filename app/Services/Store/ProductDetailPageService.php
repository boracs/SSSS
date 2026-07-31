<?php

declare(strict_types=1);

namespace App\Services\Store;

use App\Enums\ProductTag;
use App\Models\Producto;
use App\Services\Seo\PublicPageSeoService;
use Illuminate\Support\Facades\Storage;

/**
 * Orquestación de la ficha pública de producto (Inertia ProductoVer).
 * Precios/stock/galería listos para render; sin lógica de negocio en JSX.
 */
final class ProductDetailPageService
{
    public function __construct(
        private readonly PublicPageSeoService $seo,
    ) {}

    /**
     * @return array{
     *     producto: array<string, mixed>,
     *     productosRelacionados: list<array<string, mixed>>,
     *     seo: array<string, mixed>
     * }
     */
    public function forInertia(Producto $producto): array
    {
        $producto->loadMissing(['imagenes']);

        $detail = $this->detailPayload($producto);
        $related = $this->relatedPayload($producto);

        return [
            'producto' => $detail,
            'productosRelacionados' => $related,
            'seo' => $this->seo->producto(
                id: (int) $producto->id,
                name: (string) $producto->nombre,
                priceEur: (float) $detail['precio_final'],
                inStock: (bool) $detail['in_stock'],
                imageUrl: (string) ($detail['imagen_principal'] ?? ''),
                categoryLabels: $detail['tag_labels'] ?? [],
                description: (string) ($detail['summary'] ?? ''),
            )->toArray(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function detailPayload(Producto $producto): array
    {
        $imagenes = $producto->imagenes
            ->map(static fn ($img): array => [
                'id' => $img->id,
                'ruta' => asset('storage/'.$img->ruta),
                'es_principal' => (bool) $img->es_principal,
            ])
            ->sortByDesc('es_principal')
            ->values();

        $gallery = $imagenes->pluck('ruta')->filter()->values()->all();
        $principal = $gallery[0] ?? asset('img/placeholder.svg');

        $precio = round((float) $producto->precio, 2);
        $descuento = max(0.0, (float) ($producto->descuento ?? 0));
        $precioFinal = $descuento > 0
            ? round($precio - ($precio * $descuento / 100), 2)
            : $precio;
        $ahorro = round($precio - $precioFinal, 2);
        $stock = (int) $producto->unidades;
        $inStock = $stock > 0;
        $lowStock = $stock > 0 && $stock <= 3;
        $tags = $producto->normalizedTags();
        $tagLabels = ProductTag::labelsFor($tags);
        $copy = $this->clubCopyFor((string) $producto->nombre, $tags, $tagLabels);

        return [
            'id' => $producto->id,
            'nombre' => (string) $producto->nombre,
            'summary' => $copy['summary'],
            'highlights' => $copy['highlights'],
            'precio' => $precio,
            'precio_final' => $precioFinal,
            'ahorro' => $ahorro,
            'descuento' => $descuento,
            'descuento_pct' => $descuento > 0 ? (int) round($descuento) : 0,
            'precio_formatted' => $this->formatEur($precio),
            'precio_final_formatted' => $this->formatEur($precioFinal),
            'ahorro_formatted' => $this->formatEur($ahorro),
            'has_discount' => $descuento > 0 && $ahorro > 0,
            'unidades' => $stock,
            'max_qty' => max(0, $stock),
            'in_stock' => $inStock,
            'low_stock' => $lowStock,
            'stock_label' => $this->stockLabel($stock, $inStock, $lowStock),
            'tags' => $tags,
            'tag_labels' => $tagLabels,
            'imagenes' => $imagenes->all(),
            'gallery' => $gallery !== [] ? $gallery : [$principal],
            'imagen_principal' => $principal,
        ];
    }

    /**
     * Copy seguro de club (sin inventar materiales ni precios).
     *
     * @param  list<string>  $tags
     * @param  list<string>  $tagLabels
     * @return array{summary: string, highlights: list<string>}
     */
    private function clubCopyFor(string $nombre, array $tags, array $tagLabels): array
    {
        $name = trim($nombre) !== '' ? trim($nombre) : 'Este artículo';
        $categoryHint = $tagLabels !== []
            ? implode(', ', array_slice($tagLabels, 0, 2))
            : 'material del club';

        $focus = match (true) {
            in_array(ProductTag::TABLAS->value, $tags, true) => 'Ideal para completar o renovar tu quiver con material del club.',
            in_array(ProductTag::NEOPRENO->value, $tags, true),
            in_array(ProductTag::INVIERNO->value, $tags, true) => 'Pensado para sesiones en Zurriola y el Cantábrico, con el soporte del equipo S4.',
            in_array(ProductTag::MATERIAL_SURF->value, $tags, true) => 'Accesorio de surf del club para tu día a día en el agua.',
            in_array(ProductTag::CAMISETAS->value, $tags, true),
            in_array(ProductTag::BANADORES->value, $tags, true),
            in_array(ProductTag::PANTALONES->value, $tags, true),
            in_array(ProductTag::CALZADO->value, $tags, true) => 'Prenda del club S4, disponible para socios con taquilla activa.',
            default => 'Artículo de la tienda oficial S4 para socios del club.',
        };

        $summary = $name.' forma parte de la tienda de socios de San Sebastián Surf School ('
            .$categoryHint.'). '.$focus
            .' El precio mostrado es el de club; recogida en nuestras instalaciones a pie de Zurriola.';

        return [
            'summary' => $summary,
            'highlights' => [
                'Uso y disponibilidad en el club S4 (Zurriola, Donostia).',
                'Recogida en la escuela, a pie de playa.',
                'Precio de socios con taquilla activa.',
            ],
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function relatedPayload(Producto $producto): array
    {
        $currentTags = $producto->normalizedTags();

        return Producto::query()
            ->where('eliminado', 0)
            ->where('id', '!=', $producto->id)
            ->with(['imagenPrincipal:id,producto_id,ruta,nombre,es_principal'])
            ->get()
            ->map(function (Producto $p): array {
                $ruta = $p->imagenPrincipal?->ruta ?? $p->imagenPrincipal?->nombre;
                $imagen = null;
                if ($ruta !== null && $ruta !== '') {
                    $imagen = str_starts_with((string) $ruta, 'http')
                        ? (string) $ruta
                        : Storage::disk('public')->url(ltrim((string) $ruta, '/'));
                }

                $precio = round((float) $p->precio, 2);
                $descuento = max(0.0, (float) ($p->descuento ?? 0));

                return [
                    'id' => $p->id,
                    'nombre' => (string) $p->nombre,
                    'precio' => $precio,
                    'unidades' => (int) $p->unidades,
                    'descuento' => $descuento,
                    'tags' => $p->normalizedTags(),
                    'imagen' => $imagen,
                    'imagenPrincipal' => $imagen,
                    '_tag_score' => 0,
                ];
            })
            ->map(static function (array $row) use ($currentTags): array {
                $row['_tag_score'] = $currentTags === []
                    ? 0
                    : count(array_intersect($row['tags'], $currentTags));

                return $row;
            })
            ->sort(static function (array $a, array $b): int {
                if ($a['_tag_score'] !== $b['_tag_score']) {
                    return $b['_tag_score'] <=> $a['_tag_score'];
                }

                return ((float) ($b['descuento'] ?? 0)) <=> ((float) ($a['descuento'] ?? 0));
            })
            ->take(12)
            ->map(static function (array $row): array {
                unset($row['_tag_score'], $row['tags']);

                return $row;
            })
            ->values()
            ->all();
    }

    private function formatEur(float $amount): string
    {
        return number_format($amount, 2, ',', '.').' €';
    }

    private function stockLabel(int $stock, bool $inStock, bool $lowStock): string
    {
        if (! $inStock) {
            return 'Agotado';
        }
        if ($lowStock) {
            return $stock === 1 ? 'Última unidad' : 'Pocas unidades';
        }

        return 'En stock';
    }
}
