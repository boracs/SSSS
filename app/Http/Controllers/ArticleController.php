<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Article;
use App\Services\Seo\PublicPageSeoService;
use App\Services\Taller\TallerArticleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ArticleController extends Controller
{
    public function __construct(
        private readonly TallerArticleService $tallerArticles,
        private readonly PublicPageSeoService $pageSeo,
    ) {}

    public function index(): Response
    {
        return Inertia::render('Taller/Index', [
            'articles' => $this->tallerArticles->listCards(),
            'productos' => $this->tallerArticles->featuredStoreProducts(),
            'seo' => $this->pageSeo->tallerIndex()->toArray(),
        ]);
    }

    public function show(Article $article): Response
    {
        $related = $this->tallerArticles->relatedPage(
            excludeArticleId: (int) $article->id,
            offset: 0,
            limit: TallerArticleService::RELATED_INITIAL_LIMIT,
        );

        return Inertia::render('Taller/Show', [
            'article' => $article,
            'relatedArticles' => array_map(
                static fn ($item) => $item->toArray(),
                $related->items,
            ),
            'relatedMeta' => [
                'total' => $related->total,
                'has_more' => $related->hasMore,
                'next_offset' => $related->nextOffset,
                'page_size' => TallerArticleService::RELATED_PAGE_LIMIT,
            ],
            'productos' => $this->tallerArticles->featuredStoreProducts(),
            'seo' => $this->pageSeo->tallerArticle($article)->toArray(),
        ]);
    }

    public function related(Request $request, Article $article): JsonResponse
    {
        $validated = $request->validate([
            'offset' => ['sometimes', 'integer', 'min:0'],
            'limit' => ['sometimes', 'integer', 'min:1', 'max:12'],
        ]);

        $page = $this->tallerArticles->relatedPage(
            excludeArticleId: (int) $article->id,
            offset: (int) ($validated['offset'] ?? 0),
            limit: isset($validated['limit'])
                ? (int) $validated['limit']
                : TallerArticleService::RELATED_PAGE_LIMIT,
        );

        return response()->json($page->toArray());
    }
}
