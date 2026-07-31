<?php

namespace App\Http\Controllers;

use App\Enums\ProductTag;
use App\Models\Producto;
use App\Services\Seo\PublicPageSeoService;
use Inertia\Inertia;
use Inertia\Response;

class TiendaController extends Controller
{
    public function index(PublicPageSeoService $pageSeo): Response
    {
        $productos = Producto::where('eliminado', 0)
            ->with('imagenes')
            ->orderBy('nombre', 'asc')
            ->orderBy('id', 'asc')
            ->get()
            ->map(function (Producto $producto) {
                $imagen = $producto->imagenes->firstWhere('es_principal', 1);
                $ruta = $imagen ? $imagen->ruta : 'img/placeholder.jpg';

                return $producto->toStorePayload($ruta);
            })
            ->values()
            ->all();

        return Inertia::render('Tienda', [
            'productos' => $productos,
            'productTagOptions' => ProductTag::optionsForFrontend(),
            'seo' => $pageSeo->tienda()->toArray(),
        ]);
    }
}
