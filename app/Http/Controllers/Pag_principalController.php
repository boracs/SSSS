<?php

namespace App\Http\Controllers;

use App\Models\Producto;
use App\Services\SurfConditions\SurfDailyBriefService;
use App\Services\Seo\PublicPageSeoService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class Pag_principalController extends Controller
{
    public function __construct(
        private readonly SurfDailyBriefService $surfBriefService,
        private readonly PublicPageSeoService $pageSeo,
    ) {}

    public function index(Request $request)
    {
        $productos = Producto::query()
            ->where('eliminado', 0)
            ->with(['imagenPrincipal:id,producto_id,ruta,nombre,es_principal'])
            ->orderByDesc('descuento')
            ->orderBy('nombre')
            ->take(6)
            ->get();

        /** @var list<array<string, mixed>> $productosPayload */
        $productosPayload = $productos->map(static function (Producto $p): array {
            $ruta = $p->imagenPrincipal?->ruta ?? $p->imagenPrincipal?->nombre;

            return $p->toStorePayload(
                $ruta !== null && $ruta !== '' ? (string) $ruta : null
            );
        })->values()->all();

        return Inertia::render('Pag_principal', [
            'productos' => $productosPayload,
            'surfBrief' => $this->surfBriefService->publicPayload($request),
            'seo' => $this->pageSeo->home()->toArray(),
        ]);
    }
}
