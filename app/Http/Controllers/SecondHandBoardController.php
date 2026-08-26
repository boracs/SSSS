<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\SecondHandBoard;
use App\Services\Media\CatalogImageService;
use App\Services\Seo\PublicPageSeoService;
use App\Services\Store\SecondHandPublicCatalogService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Catálogo público de tablas de segunda mano.
 * No expone datos financieros internos (purchase_price, margen).
 */
class SecondHandBoardController extends Controller
{
    public function index(
        Request $request,
        PublicPageSeoService $pageSeo,
        SecondHandPublicCatalogService $catalog,
    ): Response {
        $page = $catalog->catalogPage($request);

        return Inertia::render('SecondHand/Index', [
            ...$page->toInertia(),
            'seo' => $pageSeo->segundaManoIndex()->toArray(),
        ]);
    }

    public function show(
        SecondHandBoard $secondHandBoard,
        PublicPageSeoService $pageSeo,
        SecondHandPublicCatalogService $catalog,
        CatalogImageService $catalogImages,
    ): Response {
        $catalog->assertPubliclyViewable($secondHandBoard);

        $public = $secondHandBoard->toPublicArray(images: $catalogImages);

        return Inertia::render('SecondHand/Show', [
            'board' => $public,
            'navigation' => $catalog->neighbors($secondHandBoard),
            'seo' => $pageSeo->segundaManoShow($public)->toArray(),
        ]);
    }
}
