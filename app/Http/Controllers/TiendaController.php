<?php

namespace App\Http\Controllers;

use App\Enums\ProductTag;
use App\Models\Producto;
use App\Services\Seo\PublicPageSeoService;
use App\Services\Store\StorePromoBannerService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TiendaController extends Controller
{
    public function index(
        Request $request,
        PublicPageSeoService $pageSeo,
        StorePromoBannerService $promoBanner,
    ): Response {
        $productos = Producto::where('eliminado', 0)
            ->with('imagenes')
            ->orderBy('nombre', 'asc')
            ->orderBy('id', 'asc')
            ->get()
            ->map(function (Producto $producto) {
                $imagen = $producto->imagenes->firstWhere('es_principal', 1);

                return $producto->toStorePayload($imagen?->ruta);
            })
            ->values()
            ->all();

        $tagQuery = $request->string('tag')->toString();
        $initialTag = in_array($tagQuery, ProductTag::values(), true) ? $tagQuery : null;

        return Inertia::render('Tienda', [
            'productos' => $productos,
            'productTagOptions' => ProductTag::optionsForFrontend(),
            'initialTag' => $initialTag,
            'storePromoSlides' => $promoBanner->slidesForInertia(
                excludeProductId: null,
                viewerUserId: $request->user()?->id,
            ),
            'seo' => $pageSeo->tienda()->toArray(),
        ]);
    }
}
