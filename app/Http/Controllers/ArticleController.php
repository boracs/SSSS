<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Article;
use App\Models\Producto;
use Inertia\Inertia;
use Inertia\Response;

class ArticleController extends Controller
{
    public function index(): Response
    {
        $articles = Article::query()
            ->select(['id', 'title', 'slug', 'excerpt'])
            ->orderBy('id')
            ->get();

        return Inertia::render('Taller/Index', [
            'articles' => $articles,
            'productos' => $this->featuredStoreProducts(),
        ]);
    }

    public function show(Article $article): Response
    {
        $relatedArticles = Article::query()
            ->select(['id', 'title', 'slug', 'excerpt'])
            ->where('id', '!=', $article->id)
            ->inRandomOrder()
            ->limit(3)
            ->get();

        return Inertia::render('Taller/Show', [
            'article' => $article,
            'relatedArticles' => $relatedArticles,
            'productos' => $this->featuredStoreProducts(),
        ]);
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function featuredStoreProducts(int $limit = 10): array
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
