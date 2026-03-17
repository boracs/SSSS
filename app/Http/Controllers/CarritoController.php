<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Carrito;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use App\Models\Producto;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Facades\DB;

class CarritoController extends Controller
{
    /** Muestra el carrito del usuario. Cálculos en tipos numéricos; formateo en vista. */
    public function index(): InertiaResponse
    {
        $user = auth()->user();

        $carrito = Carrito::where('id_usuario', $user->id)
            ->with(['productos' => function ($query) {
                $query->select('productos.id', 'productos.nombre', 'productos.precio', 'productos.descuento')
                    ->withPivot('cantidad');
            }])
            ->get();

        if ($carrito->isEmpty()) {
            return Inertia::render('Carrito', [
                'productos' => [],
                'total' => 0,
                'message' => 'Tu carrito está vacío.',
            ]);
        }

        $productos = $carrito->flatMap(function ($item) {
            return $item->productos->map(function ($producto) {
                $cantidad = (int) $producto->pivot->cantidad;
                $descuento = (float) $producto->descuento;
                $precioBase = (float) $producto->precio;
                $precioConDescuento = $precioBase - ($precioBase * ($descuento / 100));
                $subtotal = $precioConDescuento * $cantidad;

                return [
                    'id' => $producto->id,
                    'nombre' => $producto->nombre,
                    'precio' => $precioConDescuento,
                    'cantidad' => $cantidad,
                    'subtotal' => round($subtotal, 2),
                    'descuento' => $descuento,
                ];
            });
        });

        $total = $productos->reduce(function (float $acc, array $producto): float {
            return $acc + (float) $producto['subtotal'];
        }, 0.0);

        return Inertia::render('Carrito', [
            'productos' => $productos->values()->all(),
            'total' => round($total, 2),
        ]);
    }




    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////




    public function agregarAlCarrito(int $productoId): \Illuminate\Http\RedirectResponse
    {
    $user = auth()->user();

    try {
        DB::beginTransaction(); // 🛡️ INICIO

        $producto = Producto::find($productoId);

        // 1. VERIFICACIÓN DEL PRODUCTO
        if (!$producto) {
            DB::rollBack();
            return back()->with('error', 'El producto solicitado ya no está disponible.');
        }

        // 2. VERIFICACIÓN DE STOCK INICIAL
        if ($producto->unidades <= 0) {
            DB::rollBack();
            return back()->with('error', '¡Agotado! No queda stock disponible de ' . $producto->nombre . '.');
        }

        // 3. OBTENER O CREAR CARRITO (Atomicidad: si falla, se revierte)
        // Usamos firstOrCreate para que la operación esté dentro del control transaccional
        $carrito = Carrito::firstOrCreate(['id_usuario' => $user->id]);

        $productoEnCarrito = $carrito->productos()->where('producto_id', $productoId)->first();
        $cantidadAAgregar = 1;

        if ($productoEnCarrito) {
            $nuevaCantidad = $productoEnCarrito->pivot->cantidad + $cantidadAAgregar;

            // 4. VERIFICACIÓN AVANZADA: Cantidad vs. Stock
            if ($nuevaCantidad > $producto->unidades) {
                DB::rollBack();
                return back()->with('error', 'Ya tienes la cantidad máxima (' . $producto->unidades . ') de ' . $producto->nombre . ' del tock que nos queda.');
            }
            
            $carrito->productos()->updateExistingPivot($productoId, [
                'cantidad' => DB::raw('cantidad + 1'), 
            ]);
        } else {
            $carrito->productos()->attach($productoId, ['cantidad' => $cantidadAAgregar]);
        }

        DB::commit(); // ✅ COMMIT: Cambios guardados

        // --- Lógica de Recálculo y Formateo (solo lectura) ---
        // ... (Tu código de recálculo aquí)

        // 5. RESPUESTA DE ÉXITO DE INERTIA
        return back()->with('success', 'Producto agregado al carrito exitosamente.');

    } catch (\Exception $e) {
        // ❌ FALLO: Rollback y respuesta de error a Inertia
        DB::rollBack();
        
        \Log::error('Error al agregar al carrito: ' . $e->getMessage()); 
        
        // ¡IMPORTANTE! Siempre devolvemos back()->with()
        return back()->with('error', 'Ocurrió un error inesperado en el servidor. Por favor, intenta de nuevo.');
    }
}



    public function eliminarProducto(int $productoId): \Illuminate\Http\RedirectResponse
    {
        $user = auth()->user();
        $carrito = Carrito::where('id_usuario', $user->id)->first();

        if (!$carrito) {
            // Si el carrito no existe, redirigimos con un error, ya que es una petición Inertia
            return Redirect::back()->with('error', 'Carrito no encontrado.');
        }

        $producto = $carrito->productos()->find($productoId);

        if ($producto) {
            $nombreProducto = $producto->nombre;
            $carrito->productos()->detach($productoId);

            // ¡SOLUCIÓN! Redirigimos a la misma página del carrito (carrito.index).
            // Inertia interceptará esto y recargará los props 'productos' y 'total'.
            return Redirect::route('carrito')->with('success', "El producto \"$nombreProducto\" ha sido eliminado del carrito.");
        }

        return Redirect::back()->with('error', 'Producto no encontrado en el carrito.');
    }

}

























