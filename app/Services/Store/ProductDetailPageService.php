<?php

declare(strict_types=1);

namespace App\Services\Store;

use App\Enums\ProductTag;
use App\Models\Producto;
use App\Services\Media\CatalogImageService;
use App\Services\Seo\PublicPageSeoService;
use App\Support\MoneyCents;

/**
 * Orquestación de la ficha pública de producto (Inertia ProductoVer).
 * Precios/stock/galería listos para render; sin lógica de negocio en JSX.
 */
final class ProductDetailPageService
{
    public function __construct(
        private readonly PublicPageSeoService $seo,
        private readonly CatalogImageService $catalogImages,
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
            ->map(fn ($img): array => [
                'id' => $img->id,
                'ruta' => $this->catalogImages->publicMasterUrl($img->ruta) ?? asset('img/placeholder.svg'),
                'thumb' => $this->catalogImages->publicThumbUrl($img->ruta) ?? asset('img/placeholder.svg'),
                'es_principal' => (bool) $img->es_principal,
            ])
            ->sortByDesc('es_principal')
            ->values();

        $gallery = $imagenes->pluck('ruta')->filter()->values()->all();
        $galleryThumbs = $imagenes->pluck('thumb')->filter()->values()->all();
        $principal = $gallery[0] ?? asset('img/placeholder.svg');

        $precio = StoreProductPricing::catalogEuros($producto->precio);
        $descuento = max(0.0, (float) ($producto->descuento ?? 0));
        $precioFinal = StoreProductPricing::unitPriceEuros($producto->precio, $descuento);
        $ahorro = MoneyCents::centsToEuros(
            MoneyCents::eurosToCents($precio) - MoneyCents::eurosToCents($precioFinal),
        );
        $stock = (int) $producto->unidades;
        $inStock = $stock > 0;
        $lowStock = $stock > 0 && $stock <= 3;
        $tags = $producto->normalizedTags();
        $tagLabels = ProductTag::labelsFor($tags);
        $summary = $this->clubSummaryFor((string) $producto->nombre, $tags, $tagLabels);

        return [
            'id' => $producto->id,
            'nombre' => (string) $producto->nombre,
            'summary' => $summary,
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
            'gallery_thumbs' => $galleryThumbs !== [] ? $galleryThumbs : [$principal],
            'imagen_principal' => $principal,
        ];
    }

    /**
     * Copy seguro de club (sin inventar materiales ni precios).
     * Recogida, precio de socio y acceso van en el trust strip de la ficha, no aquí.
     *
     * @param  list<string>  $tags
     * @param  list<string>  $tagLabels
     */
    private function clubSummaryFor(string $nombre, array $tags, array $tagLabels): string
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
            in_array(ProductTag::CALZADO->value, $tags, true) => 'Prenda del club S4.',
            default => 'Artículo de la tienda oficial S4.',
        };

        return $name.' forma parte de la tienda de socios de San Sebastián Surf School ('
            .$categoryHint.'). '.$focus;
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
                    $imagen = Producto::publicListingUrl((string) $ruta, $this->catalogImages);
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
