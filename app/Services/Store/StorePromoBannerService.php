<?php

declare(strict_types=1);

namespace App\Services\Store;

use App\DTOs\Store\StorePromoSlideDto;
use App\Models\Producto;
use App\Services\Auctions\AuctionCatalogService;
use App\Support\MoneyCents;

final class StorePromoBannerService
{

    public function __construct(
        private readonly AuctionCatalogService $auctionCatalog,
    ) {}

    /**
     * @return list<array<string, mixed>>
     */
    public function slidesForInertia(?int $excludeProductId = null, ?int $viewerUserId = null): array
    {
        $slides = [
            $this->bonoReferralSlide(),
        ];

        $auction = $this->featuredAuctionSlide($viewerUserId);
        if ($auction !== null) {
            $slides[] = $auction;
        }

        $product = $this->featuredProductSlide($excludeProductId);
        if ($product !== null) {
            $slides[] = $product;
        }

        return array_map(
            static fn (StorePromoSlideDto $slide): array => $slide->toArray(),
            $slides,
        );
    }

    private function bonoReferralSlide(): StorePromoSlideDto
    {
        /** @var array<string, mixed> $promo */
        $promo = config('store.promo_bono', []);
        $route = (string) ($promo['route'] ?? 'contacto');
        $cents = max(0, (int) ($promo['price_cents'] ?? 25000));
        $priceLabel = MoneyCents::formatEurosLabel($cents);
        $titleTemplate = (string) ($promo['title_template'] ?? 'Bono recomendado · {price}');
        $title = str_replace('{price}', $priceLabel, $titleTemplate);

        return new StorePromoSlideDto(
            key: 'bono-recomendado',
            eyebrow: (string) ($promo['eyebrow'] ?? 'Oferta recomendados'),
            title: $title,
            subtitle: (string) ($promo['subtitle'] ?? ''),
            ctaLabel: (string) ($promo['cta_label'] ?? 'Consultar oferta'),
            href: route($route),
            imageUrl: (string) ($promo['image'] ?? '/img/store/promo-bono.webp'),
            priceLabel: $priceLabel,
        );
    }

    private function featuredAuctionSlide(?int $viewerUserId): ?StorePromoSlideDto
    {
        $catalog = $this->auctionCatalog->publicCatalog($viewerUserId);
        if ($catalog->isEmpty()) {
            return null;
        }

        $live = $catalog->filter(fn (array $a) => (bool) ($a['is_live'] ?? false));
        $pool = $live->isNotEmpty() ? $live : $catalog;

        $best = $pool->sortByDesc(function (array $a): int {
            $bids = (int) ($a['bid_count'] ?? 0);
            $price = (int) ($a['current_price_cents'] ?? 0);

            return ($bids * 1_000_000) + $price;
        })->first();

        if (! is_array($best)) {
            return null;
        }

        $image = (string) config('store.promo_images.auction', '/img/store/promo-subasta.webp');

        $slug = (string) ($best['slug'] ?? '');
        $href = $slug !== '' ? route('auctions.show', $slug) : route('auctions.index');

        $cents = (int) ($best['current_price_cents'] ?? 0);

        return new StorePromoSlideDto(
            key: 'auction-'.(string) ($best['id'] ?? '0'),
            eyebrow: (bool) ($best['is_live'] ?? false) ? 'Subasta en curso' : 'Subastas del club',
            title: (string) ($best['title'] ?? 'Subasta del club'),
            subtitle: (bool) ($best['is_live'] ?? false)
                ? 'Puja actual · material del club a mejor postor.'
                : 'Mira las subastas del club y las últimas adjudicaciones.',
            ctaLabel: 'Ver subasta',
            href: $href,
            imageUrl: $image,
            priceLabel: $this->formatCentsLabel($cents),
        );
    }

    private function featuredProductSlide(?int $excludeProductId): ?StorePromoSlideDto
    {
        $query = Producto::query()
            ->where('eliminado', 0)
            ->where('unidades', '>', 0)
            ->where('descuento', '>', 0)
            ->with('imagenes')
            ->orderByDesc('descuento')
            ->orderByDesc('id');

        if ($excludeProductId !== null) {
            $query->where('id', '!=', $excludeProductId);
        }

        $producto = $query->first();

        if ($producto === null) {
            $fallbackQuery = Producto::query()
                ->where('eliminado', 0)
                ->where('unidades', '>', 0)
                ->with('imagenes')
                ->orderByDesc('id');

            if ($excludeProductId !== null) {
                $fallbackQuery->where('id', '!=', $excludeProductId);
            }

            $producto = $fallbackQuery->first();
        }

        if ($producto === null) {
            return null;
        }

        $image = (string) config('store.promo_images.product', '/img/store/promo-producto.webp');

        $descuentoPct = (int) round((float) ($producto->descuento ?? 0));
        $finalCents = StoreProductPricing::unitPriceCents($producto->precio, $producto->descuento ?? 0);
        $priceLabel = $this->formatCentsLabel($finalCents);
        $productImageUrl = $this->resolveProductImageUrl($producto);
        $imageUrl = $productImageUrl ?? $image;

        return new StorePromoSlideDto(
            key: 'product-'.$producto->id,
            eyebrow: $descuentoPct > 0 ? 'Oferta tienda socios' : 'Tienda socios',
            title: (string) $producto->nombre,
            subtitle: $this->productPromoSubtitle($producto, $descuentoPct, $finalCents),
            ctaLabel: 'Ver producto',
            href: route('producto.ver', $producto->id),
            imageUrl: $imageUrl,
            priceLabel: $descuentoPct > 0 ? '-'.$descuentoPct.'% · '.MoneyCents::formatEurosLabel($finalCents) : MoneyCents::formatEurosLabel($finalCents),
            thumbUrl: $productImageUrl,
        );
    }

    private function resolveProductImageUrl(Producto $producto): ?string
    {
        $producto->loadMissing('imagenes');
        $img = $producto->imagenes->firstWhere('es_principal', true) ?? $producto->imagenes->first();
        $ruta = $img?->ruta ?? $img?->nombre;

        return Producto::publicImageUrl(is_string($ruta) ? $ruta : null);
    }

    private function productPromoSubtitle(Producto $producto, int $descuentoPct, int $finalCents): string
    {
        $stock = (int) $producto->unidades;
        $parts = [];

        if ($descuentoPct > 0) {
            $catalogCents = MoneyCents::eurosToCents($producto->precio);
            $ahorroCents = max(0, $catalogCents - $finalCents);
            if ($ahorroCents > 0) {
                $parts[] = 'Ahorras '.MoneyCents::formatEurosLabel($ahorroCents).' · precio socio';
            } else {
                $parts[] = 'Precio exclusivo para socios con taquilla.';
            }
        } else {
            $parts[] = 'Material del club con precio de socio.';
        }

        if ($stock > 0 && $stock <= 3) {
            $parts[] = $stock === 1 ? 'Solo queda 1 unidad.' : "Solo quedan {$stock} unidades.";
        }

        return implode(' ', $parts);
    }

    private function formatCentsLabel(int $cents): string
    {
        return MoneyCents::formatEurosLabel($cents);
    }
}
