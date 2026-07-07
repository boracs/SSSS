<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Pedido;
use App\Models\Producto;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class PedidoController extends Controller
{
    public function crear(Request $request): \Illuminate\Http\RedirectResponse
    {
    //VALIDACIÓN (carrito vía FormData: productos_json + justificante obligatorio)
    $request->validate([
        'productos_json' => ['required', 'json'],
        'total' => ['required', 'numeric', 'min:0'],
        'proof' => ['required', 'file', 'mimes:jpeg,jpg,png,pdf', 'max:10240'],
        'payment_method' => ['nullable', 'in:bizum,transferencia'],
        'fecha_entrega' => ['nullable', 'date_format:d/m/Y'],
    ]);
    /** @var array<int, array{id:int, cantidad:int}>|null */
    $productosCarrito = json_decode((string) $request->input('productos_json'), true);
    if (! is_array($productosCarrito) || $productosCarrito === []) {
        return back()->withErrors(['productos_json' => 'El carrito enviado no es válido.']);
    }
    $user = auth()->user();
    
    // 1. Manejo de autenticación
    if (!$user) {
        // En lugar de JSON 401, redirigimos al login (o a la página anterior con un error)
        return back()->with('error', 'Debes iniciar sesión para realizar un pedido.');
    }

    $totalCarrito = 0.0;
    $fechaEntrega = $request->input('fecha_entrega')
        ? Carbon::createFromFormat('d/m/Y', $request->input('fecha_entrega'))->format('Y-m-d')
        : null;

    DB::beginTransaction();
    try {
        $pedido = Pedido::create([
            'user_id' => $user->id,
            'precio_total' => 0,
            'pagado' => false,
            'entregado' => false,
            'fecha_entrega' => $fechaEntrega,
        ]);

        foreach ($productosCarrito as $idx => $producto) {
            if (! isset($producto['id'], $producto['cantidad'])) {
                DB::rollBack();

                return back()->withErrors(['productos_json' => "Carrito inválido en la posición {$idx}."]);
            }
            $prod = Producto::find($producto['id']);

            if (!$prod) {
                DB::rollBack();
                return back()->withErrors(['general' => "El producto con ID {$producto['id']} no existe."]);
            }

            if ($prod->unidades < $producto['cantidad']) {
                DB::rollBack();
                return back()->withErrors(['stock' => "No hay stock suficiente para el producto '{$prod->nombre}'. Tal vez se ha agotado recientemente."]);
            }

            $precioBase = (float) $prod->precio;
            $descuento = (float) $prod->descuento;
            $precioConDescuento = $precioBase - ($precioBase * ($descuento / 100));
            $subtotal = $precioConDescuento * (int) $producto['cantidad'];
            $totalCarrito += $subtotal;

            $pedido->productos()->attach($prod->id, [
                'cantidad' => (int) $producto['cantidad'],
                'descuento_aplicado' => $descuento,
                'precio_pagado' => round($precioConDescuento, 2),
            ]);

            // Reducir stock
            $prod->decrement('unidades', $producto['cantidad']);
        }

        $pedido->update(['precio_total' => round($totalCarrito, 2)]);

        $proofPath = $request->file('proof')->store('pedido-proofs/'.$pedido->id, 'local');
        $pedido->update([
            'payment_proof_path' => $proofPath,
            'payment_method' => $request->input('payment_method'),
            'proof_uploaded_at' => now(),
        ]);

        // 4. Vaciar carrito del usuario (CRUCIAL para la sincronización de Inertia)
        // Esto garantiza que el carrito compartido ($user->carrito() en HandleInertiaRequests) 
        // esté vacío en la siguiente petición.
        $user->carrito()->delete();

        DB::commit();

        // 5. Redirección de Éxito (Navegación de Inertia)
        // Redirigimos a la nueva página de confirmación.
        return back()->with('success', 'El pedido se ha realizado correctamente. Su carrito ha sido vaciado.');

    } catch (\Exception $e) {
    DB::rollBack();
    
    // ⭐️ CAMBIO: Usa el mensaje de la excepción para el debug ⭐️
    // Esto es temporal. NO expongas mensajes técnicos al usuario final.
    $errorMessage = 'Error técnico: ' . $e->getMessage() . ' en la línea ' . $e->getLine();
    
    Log::error("Fallo al crear el pedido para el usuario {$user->id}: " . $e->getMessage(), ['trace' => $e->getTraceAsString()]);

    // Devuelve el mensaje técnico para verlo en el frontend/consola
    return back()->withErrors(['general' => $errorMessage]);
    }
}

    public function mostrarPedido(int $id_pedido): InertiaResponse
    {
        $query = Pedido::where('id', $id_pedido)
            ->with(['usuario', 'productos.imagenes']);

        // Si no es admin, solo puede ver sus propios pedidos
        if (Auth::user()->role !== 'admin') {
            $query->where('user_id', Auth::id());
        }

        $pedido = $query->firstOrFail();

        $resolveImagen = static function (Producto $producto): ?string {
            $imagen = $producto->imagenes->firstWhere('es_principal', true)
                ?? $producto->imagenes->first();

            if (! $imagen || ! $imagen->ruta) {
                return null;
            }

            $ruta = $imagen->ruta;

            if (str_starts_with($ruta, 'http') || str_starts_with($ruta, '/')) {
                return $ruta;
            }

            return '/storage/'.ltrim($ruta, '/');
        };

        $items = $pedido->productos->map(function (Producto $producto) use ($resolveImagen) {
            $cantidad = (int) $producto->pivot->cantidad;
            $precioPagado = (float) $producto->pivot->precio_pagado;
            $descuento = (float) $producto->pivot->descuento_aplicado;

            return [
                'id' => $producto->id,
                'nombre' => $producto->nombre,
                'imagen' => $resolveImagen($producto),
                'cantidad' => $cantidad,
                'precio_pagado' => $precioPagado,
                'descuento_aplicado' => $descuento,
                'subtotal' => round($precioPagado * $cantidad, 2),
            ];
        })->values();

        $subtotalSinDescuento = $pedido->productos->reduce(function (float $carry, Producto $producto) {
            $cantidad = (int) $producto->pivot->cantidad;
            $descuento = (float) $producto->pivot->descuento_aplicado;
            $precioPagado = (float) $producto->pivot->precio_pagado;
            $precioBase = $descuento > 0
                ? $precioPagado / (1 - ($descuento / 100))
                : $precioPagado;

            return $carry + ($precioBase * $cantidad);
        }, 0.0);

        $totalDescuentos = round($subtotalSinDescuento - (float) $pedido->precio_total, 2);

        return Inertia::render('Pedido', [
            'isAdminView' => Auth::user()->role === 'admin',
            'pedido' => [
                'id' => $pedido->id,
                'precio_total' => (float) $pedido->precio_total,
                'subtotal' => round($subtotalSinDescuento, 2),
                'descuentos' => $totalDescuentos > 0 ? $totalDescuentos : 0.0,
                'pagado' => (bool) $pedido->pagado,
                'entregado' => (bool) $pedido->entregado,
                'payment_method' => $pedido->payment_method,
                'created_at' => optional($pedido->created_at)->toIso8601String(),
                'proof_uploaded_at' => optional($pedido->proof_uploaded_at)->toIso8601String(),
                'cliente' => [
                    'nombre' => trim(($pedido->usuario->nombre ?? '').' '.($pedido->usuario->apellido ?? '')),
                    'email' => $pedido->usuario->email ?? null,
                    'telefono' => $pedido->usuario->telefono ?? null,
                ],
                'productos' => $items,
            ],
        ]);
    }


    public function mostrarPedidos(): InertiaResponse
    {
    $user_id = auth()->id();

    // Obtener los pedidos con sus productos (incluyendo imágenes), ordenados por id descendente
    $pedidos = Pedido::where('user_id', $user_id)
        ->with(['productos.imagenes'])
        ->orderBy('id', 'desc')
        ->get();

    $resolveImagen = static function (Producto $producto): ?string {
        $imagen = $producto->imagenes->firstWhere('es_principal', true)
            ?? $producto->imagenes->first();

        if (! $imagen || ! $imagen->ruta) {
            return null;
        }

        $ruta = $imagen->ruta;

        if (str_starts_with($ruta, 'http') || str_starts_with($ruta, '/')) {
            return $ruta;
        }

        return '/storage/'.ltrim($ruta, '/');
    };

    return Inertia::render('Pedidos', [
        'pedidos' => $pedidos->map(function ($pedido) use ($resolveImagen) {
            return [
                'id' => $pedido->id,
                'precio_total' => (float) $pedido->precio_total,
                'pagado' => (bool) $pedido->pagado,
                'entregado' => (bool) $pedido->entregado,
                'payment_method' => $pedido->payment_method,
                'created_at' => optional($pedido->created_at)->toIso8601String(),
                'total_articulos' => (int) $pedido->productos->sum(fn ($p) => (int) $p->pivot->cantidad),
                'productos' => $pedido->productos->map(function (Producto $producto) use ($resolveImagen) {
                    return [
                        'id' => $producto->id,
                        'nombre' => $producto->nombre,
                        'imagen' => $resolveImagen($producto),
                        'cantidad' => (int) $producto->pivot->cantidad,
                        'descuento_aplicado' => (float) $producto->pivot->descuento_aplicado,
                        'precio_pagado' => (float) $producto->pivot->precio_pagado,
                    ];
                })->values(),
            ];
        }),
    ]);
}

//---------------------------------------------------------------------------------------------///////////////////////////////////////////////

    public function index(Request $request): InertiaResponse
    {
        return $this->renderGestorPedidos($request);
    }

    public function applyFilter(Request $request): InertiaResponse
    {
        return $this->renderGestorPedidos($request);
    }

    private function renderGestorPedidos(Request $request): InertiaResponse
    {
        $pagado = (string) $request->input('pagado', '');
        $entregado = (string) $request->input('entregado', '');

        $query = Pedido::query()
            ->with([
                'usuario:id,nombre,apellido,telefono,email',
                'productos' => fn ($q) => $q
                    ->select('productos.id', 'nombre', 'precio')
                    ->with('imagenes:id,producto_id,ruta,es_principal')
                    ->withPivot('cantidad', 'descuento_aplicado', 'precio_pagado'),
            ])
            ->latest('id');

        if ($pagado === '1') {
            $query->where('pagado', true);
        } elseif ($pagado === '0') {
            $query->where('pagado', false);
        }

        if ($entregado === '1') {
            $query->where('entregado', true);
        } elseif ($entregado === '0') {
            $query->where('entregado', false);
        }

        $paginator = $query->paginate(9)->withQueryString();

        return Inertia::render('GestorPedidos', [
            'pedidos' => collect($paginator->items())
                ->map(fn (Pedido $p) => $this->mapPedidoForGestor($p))
                ->values()
                ->all(),
            'totalPedidos' => $paginator->total(),
            'currentPage' => $paginator->currentPage(),
            'lastPage' => max(1, $paginator->lastPage()),
            'filters' => [
                'pagado' => $pagado,
                'entregado' => $entregado,
            ],
            'stats' => [
                'total' => Pedido::query()->count(),
                'completos' => Pedido::query()->where('pagado', true)->where('entregado', true)->count(),
                'pagados' => Pedido::query()->where('pagado', true)->count(),
                'pendientes_pago' => Pedido::query()->where('pagado', false)->count(),
                'pendientes_entrega' => Pedido::query()->where('pagado', true)->where('entregado', false)->count(),
                'entregados_sin_pagar' => Pedido::query()->where('entregado', true)->where('pagado', false)->count(),
            ],
        ]);
    }

    /** @return array<string, mixed> */
    private function mapPedidoForGestor(Pedido $pedido): array
    {
        $productos = $pedido->productos;

        $resolveImagen = static function (Producto $producto): ?string {
            $imagen = $producto->imagenes->firstWhere('es_principal', true)
                ?? $producto->imagenes->first();

            if (! $imagen || ! $imagen->ruta) {
                return null;
            }

            $ruta = $imagen->ruta;

            if (str_starts_with($ruta, 'http') || str_starts_with($ruta, '/')) {
                return $ruta;
            }

            return '/storage/'.ltrim($ruta, '/');
        };

        $items = $productos->map(function (Producto $producto) use ($resolveImagen) {
            $cantidad = (int) $producto->pivot->cantidad;
            $precioPagado = (float) $producto->pivot->precio_pagado;

            return [
                'id' => $producto->id,
                'nombre' => $producto->nombre,
                'imagen' => $resolveImagen($producto),
                'cantidad' => $cantidad,
                'precio_pagado' => $precioPagado,
                'descuento_aplicado' => (float) $producto->pivot->descuento_aplicado,
                'subtotal' => round($precioPagado * $cantidad, 2),
            ];
        })->values()->all();

        return [
            'id' => $pedido->id,
            'precio_total' => (float) $pedido->precio_total,
            'pagado' => (bool) $pedido->pagado,
            'entregado' => (bool) $pedido->entregado,
            'payment_method' => $pedido->payment_method,
            'proof_uploaded_at' => $pedido->proof_uploaded_at?->toIso8601String(),
            'created_at' => $pedido->created_at?->toIso8601String(),
            'total_articulos' => (int) $productos->sum(fn ($p) => (int) $p->pivot->cantidad),
            'productos_preview' => $productos->take(3)->pluck('nombre')->values()->all(),
            'productos' => $items,
            'usuario' => [
                'nombre' => $pedido->usuario?->nombre,
                'apellido' => $pedido->usuario?->apellido,
                'telefono' => $pedido->usuario?->telefono,
                'email' => $pedido->usuario?->email,
            ],
        ];
    }

    public function togglePagado(int $id): \Illuminate\Http\RedirectResponse
    {
        $pedido = Pedido::findOrFail($id);
        $pedido->pagado = !$pedido->pagado;
        $pedido->save();
        return back()->with('success', 'El estado de pago ha sido actualizado.');
    }

    public function toggleEntregado(int $id): \Illuminate\Http\RedirectResponse
    {
        $pedido = Pedido::findOrFail($id);
        $pedido->entregado = !$pedido->entregado;
        $pedido->save();
        return back()->with('success', 'El estado de entrega ha sido actualizado.');
    }




}

















   




    
















