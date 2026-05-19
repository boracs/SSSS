<?php

namespace App\Http\Controllers;

use App\Models\Carrito;
use App\Models\Producto;
use Illuminate\Http\Request;
use Inertia\Inertia;

class Pag_principalController extends Controller
{
    public function index()
    {
        // Obtener los 7 primeros productos con mayor descuentos
        $productos = Producto::query()
            ->with(['imagenPrincipal:id,producto_id,ruta,nombre,es_principal'])
            ->orderBy('descuento', 'desc')
            ->take(10)
            ->get();
    
        // Obtener el usuario autenticado
        $user = auth()->user();
    
        if ($user) {
            // El usuario está autenticado
            $carrito = Carrito::where('user_id', $user->id)->first();
    
            // Comprobar si el carrito existe
            if ($carrito) {
                // Sumar las cantidades desde la tabla pivote
                $cantidadCarrito = $carrito->productos->sum(function ($producto) {
                    return $producto->pivot->cantidad;
                });
            } else {
                // Si no existe un carrito, asignamos 0
                $cantidadCarrito = 0;
            }
        } else {
            // El usuario no está autenticado
            $cantidadCarrito = 0;
        }

        /** @var list<array<string, mixed>> $productosPayload */
        $productosPayload = $productos->map(static function (Producto $p): array {
            $ruta = $p->imagenPrincipal?->ruta ?? $p->imagenPrincipal?->nombre;

            return [
                'id' => $p->id,
                'nombre' => (string) $p->nombre,
                'precio' => $p->precio,
                'unidades' => (int) $p->unidades,
                'descuento' => $p->descuento,
                'imagen' => $ruta !== null && $ruta !== '' ? (string) $ruta : null,
            ];
        })->values()->all();

        // Pasar los productos, el usuario autenticado y la cantidad de productos en el carrito a la vista
        return Inertia::render('Pag_principal', [
            'productos' => $productosPayload,
            'cantidadCarrito' => $cantidadCarrito, // Pasamos la cantidad al frontend
        ]);
    }
}