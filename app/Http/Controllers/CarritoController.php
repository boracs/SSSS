<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Carrito;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use App\Models\Producto;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CarritoController extends Controller
{
    /** Muestra el carrito del usuario. Cálculos en tipos numéricos; formateo en vista. */
    public function index(): InertiaResponse
    {
        $user = auth()->user();

        $carrito = Carrito::where('user_id', $user->id)
            ->with(['productos' => function ($query) {
                $query->select('productos.id', 'productos.nombre', 'productos.precio', 'productos.descuento')
                    ->withPivot('cantidad');
            }])
            ->get();

        $paymentProps = [
            'paymentIban' => config('services.academy.iban', '[IBAN]'),
            'paymentBizumNumber' => config('services.academy.bizum_number', '[BIZUM_NUMBER]'),
            'whatsappHelpUrl' => $this->academyWhatsappUrl(),
        ];

        if ($carrito->isEmpty()) {
            return Inertia::render('Carrito', array_merge([
                'productos' => [],
                'total' => 0,
                'message' => 'Tu carrito está vacío.',
                'canCheckout' => (bool) $user->hasActiveLocker(),
            ], $paymentProps));
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

        return Inertia::render('Carrito', array_merge([
            'productos' => $productos->values()->all(),
            'total' => round($total, 2),
            'canCheckout' => (bool) $user->hasActiveLocker(),
        ], $paymentProps));
    }

    private function academyWhatsappUrl(): ?string
    {
        $raw = (string) config('services.academy.whatsapp_number', '');
        $digits = preg_replace('/\D+/', '', $raw);

        return $digits !== '' ? 'https://wa.me/'.$digits : null;
    }

    public function agregarAlCarrito(int $productoId): \Illuminate\Http\RedirectResponse
    {
        $user = auth()->user();

        try {
            return DB::transaction(function () use ($user, $productoId) {
                $producto = Producto::query()
                    ->whereKey($productoId)
                    ->lockForUpdate()
                    ->first();

                if (! $producto) {
                    return back()->with('error', 'El producto solicitado ya no está disponible.');
                }

                if ((int) $producto->unidades <= 0) {
                    return back()->with('error', '¡Agotado! No queda stock disponible de '.$producto->nombre.'.');
                }

                $carrito = Carrito::query()
                    ->where('user_id', $user->id)
                    ->lockForUpdate()
                    ->first();

                if (! $carrito) {
                    $carrito = Carrito::create(['user_id' => $user->id]);
                }

                $productoEnCarrito = $carrito->productos()->where('producto_id', $productoId)->first();

                $cantidadAAgregar = 1;

                if ($productoEnCarrito) {
                    $nuevaCantidad = (int) $productoEnCarrito->pivot->cantidad + $cantidadAAgregar;

                    if ($nuevaCantidad > (int) $producto->unidades) {
                        return back()->with(
                            'error',
                            'Ya tienes la cantidad máxima ('.$producto->unidades.') de '.$producto->nombre.' del stock que nos queda.'
                        );
                    }

                    $carrito->productos()->updateExistingPivot($productoId, [
                        'cantidad' => DB::raw('cantidad + 1'),
                    ]);
                } else {
                    $carrito->productos()->attach($productoId, ['cantidad' => $cantidadAAgregar]);
                }

                return back()->with('success', 'Producto agregado al carrito exitosamente.');
            });
        } catch (\Throwable $e) {
            Log::error('Error al agregar al carrito: '.$e->getMessage());

            return back()->with('error', 'Ocurrió un error inesperado en el servidor. Por favor, intenta de nuevo.');
        }
    }

    public function eliminarProducto(int $productoId): \Illuminate\Http\RedirectResponse
    {
        $user = auth()->user();
        $carrito = Carrito::where('user_id', $user->id)->first();

        if (! $carrito) {
            return Redirect::back()->with('error', 'Carrito no encontrado.');
        }

        $producto = $carrito->productos()->find($productoId);

        if ($producto) {
            $nombreProducto = $producto->nombre;
            $carrito->productos()->detach($productoId);

            return Redirect::route('carrito')->with('success', "El producto \"$nombreProducto\" ha sido eliminado del carrito.");
        }

        return Redirect::back()->with('error', 'Producto no encontrado en el carrito.');
    }
}
