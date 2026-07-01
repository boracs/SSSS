<?php

namespace App\Http\Controllers;

use App\Models\Producto;
use Inertia\Inertia;
use Inertia\Response;

class TiendaController extends Controller
{
    public function index(): Response
    {
        $productos = Producto::where('eliminado', 0)
            ->with('imagenes')
            ->orderBy('nombre', 'asc')
            ->orderBy('id', 'asc')
            ->get()
            ->map(function ($producto) {
                $imagen = $producto->imagenes->firstWhere('es_principal', 1);
                $producto->imagenPrincipal = $imagen ? $imagen->ruta : 'img/placeholder.jpg';

                return $producto;
            });

        $productosParaFrontend = $productos->map(function ($p) {
            return [
                'id' => $p->id,
                'nombre' => $p->nombre,
                'precio' => $p->precio,
                'unidades' => $p->unidades,
                'descuento' => $p->descuento,
                'imagenPrincipal' => $p->imagenPrincipal,
            ];
        });

        return Inertia::render('Tienda', [
            'productos' => $productosParaFrontend,
        ]);
    }
}
