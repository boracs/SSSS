<?php

declare(strict_types=1);

namespace App\Services\Taller;

use App\DTOs\Taller\ArticleCardDto;
use App\DTOs\Taller\ArticleRelatedPageDto;
use App\Models\Article;
use App\Models\Producto;

final class TallerArticleService
{
    public const RELATED_INITIAL_LIMIT = 3;

    public const RELATED_PAGE_LIMIT = 6;

    public function listCards(): array
    {
        return Article::query()
            ->select(['id', 'title', 'slug', 'excerpt'])
            ->orderBy('id')
            ->get()
            ->map(static fn (Article $article): array => ArticleCardDto::fromModel($article)->toArray())
            ->values()
            ->all();
    }

    public function relatedPage(int $excludeArticleId, int $offset = 0, ?int $limit = null): ArticleRelatedPageDto
    {
        $limit = max(1, min(12, $limit ?? self::RELATED_PAGE_LIMIT));
        $offset = max(0, $offset);

        $base = Article::query()
            ->select(['id', 'title', 'slug', 'excerpt'])
            ->where('id', '!=', $excludeArticleId)
            ->orderBy('id');

        $total = (clone $base)->count();

        /** @var list<ArticleCardDto> $items */
        $items = $base
            ->offset($offset)
            ->limit($limit)
            ->get()
            ->map(static fn (Article $article): ArticleCardDto => ArticleCardDto::fromModel($article))
            ->values()
            ->all();

        $loaded = $offset + count($items);
        $hasMore = $loaded < $total;

        return new ArticleRelatedPageDto(
            items: $items,
            total: $total,
            offset: $offset,
            limit: $limit,
            hasMore: $hasMore,
            nextOffset: $loaded,
        );
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function featuredStoreProducts(int $limit = 10): array
    {
        return Producto::query()
            ->where('eliminado', 0)
            ->with(['imagenPrincipal:id,producto_id,ruta,nombre,es_principal'])
            ->orderByDesc('descuento')
            ->orderBy('nombre')
            ->limit($limit)
            ->get()
            ->map(static function (Producto $producto): array {
                $ruta = $producto->imagenPrincipal?->ruta ?? $producto->imagenPrincipal?->nombre;

                return $producto->toStorePayload(
                    $ruta !== null && $ruta !== '' ? (string) $ruta : null
                );
            })
            ->values()
            ->all();
    }
}
