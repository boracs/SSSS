<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\ProductTag;
use App\Models\Carrito;
use App\Models\Producto;
use App\Services\Seo\PublicPageSeoService;
use App\Services\Store\StoreProductPricing;
use App\Support\AcademyContact;
use App\Support\MoneyCents;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class CarritoController extends Controller
{
    /** Muestra el carrito del usuario. Cálculos en tipos numéricos; formateo en vista. */
    public function index(PublicPageSeoService $pageSeo): InertiaResponse
    {
        $user = auth()->user();

        $carrito = Carrito::where('user_id', $user->id)
            ->with(['productos' => function ($query) {
                $query->select(
                    'productos.id',
                    'productos.nombre',
                    'productos.precio',
                    'productos.descuento',
                    'productos.unidades',
                    'productos.tags',
                )
                    ->with('imagenPrincipal')
                    ->withPivot('cantidad');
            }])
            ->get();

        $paymentProps = [
            'whatsappHelpUrl' => AcademyContact::whatsappBaseUrl(),
            'seo' => $pageSeo->carrito()->toArray(),
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
                $unitCents = StoreProductPricing::unitPriceCents($producto->precio, $descuento);
                $lineCents = $unitCents * $cantidad;

                return [
                    'id' => $producto->id,
                    'nombre' => $producto->nombre,
                    'precio' => MoneyCents::centsToEuros($unitCents),
                    // Precio de catálogo sin descuento: el front lo muestra tachado
                    // cuando hay oferta (anclaje de ahorro); no entra en el total.
                    'precio_original' => StoreProductPricing::catalogEuros($producto->precio),
                    'cantidad' => $cantidad,
                    'subtotal' => MoneyCents::centsToEuros($lineCents),
                    'descuento' => $descuento,
                    'stock' => (int) $producto->unidades,
                    'tags' => $producto->normalizedTags(),
                    'tag_labels' => ProductTag::labelsFor($producto->normalizedTags()),
                    // Ruta relativa de la imagen principal (o null); el front resuelve /storage/…
                    'imagen' => $producto->imagenPrincipal?->ruta,
                ];
            });
        });

        $totalCents = $productos->reduce(
            static fn (int $acc, array $producto): int => $acc + MoneyCents::eurosToCents($producto['subtotal']),
            0,
        );

        return Inertia::render('Carrito', array_merge([
            'productos' => $productos->values()->all(),
            'total' => MoneyCents::centsToEuros($totalCents),
            'canCheckout' => (bool) $user->hasActiveLocker(),
        ], $paymentProps));
    }

    public function agregarAlCarrito(Request $request, int $productoId): \Illuminate\Http\RedirectResponse
    {
        $user = auth()->user();
        $cantidadAAgregar = max(1, (int) $request->input('cantidad', 1));

        try {
            return DB::transaction(function () use ($user, $productoId, $cantidadAAgregar) {
                $producto = Producto::query()
                    ->whereKey($productoId)
                    ->lockForUpdate()
                    ->first();

                if (! $producto) {
                    return back()->with('error', 'El producto solicitado ya no está disponible.');
                }

                $stock = (int) $producto->unidades;
                if ($stock <= 0) {
                    return back()->with('error', '¡Agotado! No queda stock disponible de '.$producto->nombre.'.');
                }

                $cantidadAAgregar = min($cantidadAAgregar, $stock);

                $carrito = Carrito::forUser((int) $user->id, lock: true);

                $productoEnCarrito = $carrito->productos()->where('producto_id', $productoId)->first();

                if ($productoEnCarrito) {
                    $nuevaCantidad = (int) $productoEnCarrito->pivot->cantidad + $cantidadAAgregar;

                    if ($nuevaCantidad > $stock) {
                        return back()->with(
                            'error',
                            'Ya tienes la cantidad máxima ('.$stock.') de '.$producto->nombre.' del stock que nos queda.'
                        );
                    }

                    $carrito->productos()->updateExistingPivot($productoId, [
                        'cantidad' => $nuevaCantidad,
                    ]);
                } else {
                    $carrito->productos()->attach($productoId, ['cantidad' => $cantidadAAgregar]);
                }

                return back();
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

    /**
     * Cambia la cantidad de una línea. cantidad <= 0 descarta la línea.
     */
    public function actualizarCantidad(Request $request, int $productoId): \Illuminate\Http\RedirectResponse
    {
        $user = auth()->user();
        $cantidad = (int) $request->input('cantidad', 0);

        try {
            return DB::transaction(function () use ($user, $productoId, $cantidad) {
                $carrito = Carrito::query()
                    ->where('user_id', $user->id)
                    ->lockForUpdate()
                    ->first();

                if (! $carrito) {
                    return Redirect::back()->with('error', 'Carrito no encontrado.');
                }

                $enCarrito = $carrito->productos()->where('producto_id', $productoId)->first();
                if (! $enCarrito) {
                    return Redirect::back()->with('error', 'Producto no encontrado en el carrito.');
                }

                if ($cantidad <= 0) {
                    $nombre = $enCarrito->nombre;
                    $carrito->productos()->detach($productoId);

                    return Redirect::route('carrito')->with(
                        'success',
                        "El producto \"$nombre\" ha sido descartado del carrito."
                    );
                }

                $producto = Producto::query()
                    ->whereKey($productoId)
                    ->lockForUpdate()
                    ->first();

                if (! $producto) {
                    $carrito->productos()->detach($productoId);

                    return Redirect::route('carrito')->with(
                        'error',
                        'Ese producto ya no está disponible y se ha quitado del carrito.'
                    );
                }

                $stock = (int) $producto->unidades;
                if ($stock <= 0) {
                    $carrito->productos()->detach($productoId);

                    return Redirect::route('carrito')->with(
                        'error',
                        '¡Agotado! No queda stock de '.$producto->nombre.'.'
                    );
                }

                if ($cantidad > $stock) {
                    return Redirect::back()->with(
                        'error',
                        'Solo quedan '.$stock.' unidades de '.$producto->nombre.'.'
                    );
                }

                $carrito->productos()->updateExistingPivot($productoId, [
                    'cantidad' => $cantidad,
                ]);

                return Redirect::route('carrito');
            });
        } catch (\Throwable $e) {
            Log::error('Error al actualizar cantidad del carrito: '.$e->getMessage());

            return Redirect::back()->with(
                'error',
                'Ocurrió un error inesperado. Inténtalo de nuevo.'
            );
        }
    }
}
