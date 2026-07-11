<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Actions\Payments\InitiatePaymentAction;
use App\DTOs\Payments\InitiatePaymentDto;
use App\DTOs\Payments\PaymentLineItemDto;
use App\Models\Pedido;
use App\Models\Producto;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\Response;

class PedidoController extends Controller
{
    public function __construct(
        private readonly InitiatePaymentAction $initiatePayment,
    ) {}

    // ──────────────────────────────────────────────────────────────────────────
    // CREAR PEDIDO → redirigir a Stripe
    // ──────────────────────────────────────────────────────────────────────────

    public function crear(Request $request): RedirectResponse|Response
    {
        $request->validate([
            'productos_json' => ['required', 'json'],
            'total'          => ['required', 'numeric', 'min:0'],
            'fecha_entrega'  => ['nullable', 'date_format:d/m/Y'],
        ]);

        /** @var array<int, array{id:int, cantidad:int}>|null */
        $productosCarrito = json_decode((string) $request->input('productos_json'), true);

        if (! is_array($productosCarrito) || $productosCarrito === []) {
            return back()->withErrors(['productos_json' => 'El carrito enviado no es válido.']);
        }

        $user = auth()->user();
        if (! $user) {
            return back()->with('error', 'Debes iniciar sesión para realizar un pedido.');
        }

        $fechaEntrega = $request->input('fecha_entrega')
            ? Carbon::createFromFormat('d/m/Y', (string) $request->input('fecha_entrega'))->format('Y-m-d')
            : null;

        // 1. Crear el pedido en estado "pendiente" dentro de una transacción
        $pedido = DB::transaction(function () use ($user, $productosCarrito, $fechaEntrega) {
            $pedido = Pedido::create([
                'user_id'      => $user->id,
                'precio_total' => 0,
                'pagado'       => false,
                'entregado'    => false,
                'fecha_entrega' => $fechaEntrega,
            ]);

            $total = 0.0;

            foreach ($productosCarrito as $idx => $item) {
                if (! isset($item['id'], $item['cantidad'])) {
                    throw new \InvalidArgumentException("Carrito inválido en la posición {$idx}.");
                }

                $prod = Producto::query()->find($item['id']);

                if ($prod === null) {
                    throw new \InvalidArgumentException("El producto con ID {$item['id']} no existe.");
                }

                if ($prod->unidades < $item['cantidad']) {
                    throw new \InvalidArgumentException(
                        "No hay stock suficiente para '{$prod->nombre}'."
                    );
                }

                $precioBase      = (float) $prod->precio;
                $descuento       = (float) $prod->descuento;
                $precioFinal     = $precioBase - ($precioBase * ($descuento / 100));
                $subtotal        = $precioFinal * (int) $item['cantidad'];
                $total          += $subtotal;

                $pedido->productos()->attach($prod->id, [
                    'cantidad'           => (int) $item['cantidad'],
                    'descuento_aplicado' => $descuento,
                    'precio_pagado'      => round($precioFinal, 2),
                ]);

                $prod->decrement('unidades', $item['cantidad']);
            }

            $pedido->update(['precio_total' => round($total, 2)]);

            // Vaciar carrito del usuario
            $user->carrito()->delete();

            return $pedido;
        });

        // 2. Construir líneas para Stripe Checkout
        $lineItems = $pedido->productos->map(function (Producto $prod) {
            $precioCents = (int) round((float) $prod->pivot->precio_pagado * 100);

            return new PaymentLineItemDto(
                name: $prod->nombre,
                description: '',
                unitAmountCents: $precioCents,
                quantity: (int) $prod->pivot->cantidad,
            );
        })->values()->all();

        $dto = new InitiatePaymentDto(
            payableType:   Pedido::class,
            payableId:     $pedido->id,
            lineItems:     $lineItems,
            successPath:   '/pago/exito',
            cancelPath:    '/tienda',
            customerEmail: $user->email,
            metadata:      ['pedido_id' => (string) $pedido->id],
        );

        try {
            $checkoutUrl = $this->initiatePayment->execute($dto);
        } catch (\RuntimeException $e) {
            Log::error('PedidoController::crear error al crear sesión Stripe', [
                'pedido_id' => $pedido->id,
                'user_id'   => $user->id,
                'error'     => $e->getMessage(),
            ]);

            // El pedido quedó creado; informar al usuario y no perder su compra
            return back()->with(
                'error',
                'Tu pedido fue registrado pero hubo un problema al abrir el pago. Por favor, contáctanos.'
            );
        }

        return $this->redirectToStripeCheckout($checkoutUrl);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // VISTAS (sin cambios de negocio)
    // ──────────────────────────────────────────────────────────────────────────

    public function mostrarPedido(int $id_pedido): InertiaResponse
    {
        $query = Pedido::where('id', $id_pedido)
            ->with(['usuario', 'productos.imagenes']);

        if (Auth::user()->role !== 'admin') {
            $query->where('user_id', Auth::id());
        }

        $pedido = $query->firstOrFail();

        return Inertia::render('Pedido', [
            'isAdminView' => Auth::user()->role === 'admin',
            'pedido'      => $this->mapPedido($pedido),
        ]);
    }

    public function mostrarPedidos(): InertiaResponse
    {
        $user_id = auth()->id();

        $pedidos = Pedido::where('user_id', $user_id)
            ->with(['productos.imagenes'])
            ->orderBy('id', 'desc')
            ->get();

        return Inertia::render('Pedidos', [
            'pedidos' => $pedidos->map(fn ($p) => $this->mapPedidoListItem($p)),
        ]);
    }

    public function index(Request $request): InertiaResponse
    {
        return $this->renderGestorPedidos($request);
    }

    public function applyFilter(Request $request): InertiaResponse
    {
        return $this->renderGestorPedidos($request);
    }

    public function togglePagado(int $id): RedirectResponse
    {
        $pedido         = Pedido::findOrFail($id);
        $pedido->pagado = ! $pedido->pagado;
        $pedido->save();

        return back()->with('success', 'Estado de pago actualizado.');
    }

    public function toggleEntregado(int $id): RedirectResponse
    {
        $pedido           = Pedido::findOrFail($id);
        $pedido->entregado = ! $pedido->entregado;
        $pedido->save();

        return back()->with('success', 'Estado de entrega actualizado.');
    }

    // ──────────────────────────────────────────────────────────────────────────
    // PRIVADOS
    // ──────────────────────────────────────────────────────────────────────────

    private function renderGestorPedidos(Request $request): InertiaResponse
    {
        $pagado    = (string) $request->input('pagado', '');
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
            'pedidos'      => collect($paginator->items())
                ->map(fn (Pedido $p) => $this->mapPedidoForGestor($p))
                ->values()
                ->all(),
            'totalPedidos' => $paginator->total(),
            'currentPage'  => $paginator->currentPage(),
            'lastPage'     => max(1, $paginator->lastPage()),
            'filters'      => ['pagado' => $pagado, 'entregado' => $entregado],
            'stats'        => [
                'total'               => Pedido::query()->count(),
                'completos'           => Pedido::query()->where('pagado', true)->where('entregado', true)->count(),
                'pagados'             => Pedido::query()->where('pagado', true)->count(),
                'pendientes_pago'     => Pedido::query()->where('pagado', false)->count(),
                'pendientes_entrega'  => Pedido::query()->where('pagado', true)->where('entregado', false)->count(),
                'entregados_sin_pagar' => Pedido::query()->where('entregado', true)->where('pagado', false)->count(),
            ],
        ]);
    }

    private function mapPedido(Pedido $pedido): array
    {
        $resolveImagen = $this->makeImageResolver();

        $items = $pedido->productos->map(function (Producto $producto) use ($resolveImagen) {
            $cantidad     = (int) $producto->pivot->cantidad;
            $precioPagado = (float) $producto->pivot->precio_pagado;
            $descuento    = (float) $producto->pivot->descuento_aplicado;

            return [
                'id'                 => $producto->id,
                'nombre'             => $producto->nombre,
                'imagen'             => $resolveImagen($producto),
                'cantidad'           => $cantidad,
                'precio_pagado'      => $precioPagado,
                'descuento_aplicado' => $descuento,
                'subtotal'           => round($precioPagado * $cantidad, 2),
            ];
        })->values();

        $subtotalSinDescuento = $pedido->productos->reduce(function (float $carry, Producto $producto) {
            $cantidad    = (int) $producto->pivot->cantidad;
            $descuento   = (float) $producto->pivot->descuento_aplicado;
            $precioPagado = (float) $producto->pivot->precio_pagado;
            $precioBase  = $descuento > 0 ? $precioPagado / (1 - ($descuento / 100)) : $precioPagado;

            return $carry + ($precioBase * $cantidad);
        }, 0.0);

        $totalDescuentos = round($subtotalSinDescuento - (float) $pedido->precio_total, 2);

        return [
            'id'                => $pedido->id,
            'precio_total'      => (float) $pedido->precio_total,
            'subtotal'          => round($subtotalSinDescuento, 2),
            'descuentos'        => $totalDescuentos > 0 ? $totalDescuentos : 0.0,
            'pagado'            => (bool) $pedido->pagado,
            'payment_status'    => (bool) $pedido->pagado ? 'confirmed' : 'pending',
            'entregado'         => (bool) $pedido->entregado,
            'payment_method'    => $pedido->payment_method,
            'created_at'        => optional($pedido->created_at)->toIso8601String(),
            'proof_uploaded_at' => optional($pedido->proof_uploaded_at)->toIso8601String(),
            'cliente'           => [
                'nombre'   => trim(($pedido->usuario->nombre ?? '').' '.($pedido->usuario->apellido ?? '')),
                'email'    => $pedido->usuario->email ?? null,
                'telefono' => $pedido->usuario->telefono ?? null,
            ],
            'productos' => $items,
        ];
    }

    private function mapPedidoListItem(Pedido $pedido): array
    {
        $resolveImagen = $this->makeImageResolver();

        return [
            'id'              => $pedido->id,
            'precio_total'    => (float) $pedido->precio_total,
            'pagado'          => (bool) $pedido->pagado,
            'payment_status'  => (bool) $pedido->pagado ? 'confirmed' : 'pending',
            'entregado'       => (bool) $pedido->entregado,
            'payment_method'  => $pedido->payment_method,
            'created_at'      => optional($pedido->created_at)->toIso8601String(),
            'total_articulos' => (int) $pedido->productos->sum(fn ($p) => (int) $p->pivot->cantidad),
            'productos'       => $pedido->productos->map(function (Producto $producto) use ($resolveImagen) {
                return [
                    'id'                 => $producto->id,
                    'nombre'             => $producto->nombre,
                    'imagen'             => $resolveImagen($producto),
                    'cantidad'           => (int) $producto->pivot->cantidad,
                    'descuento_aplicado' => (float) $producto->pivot->descuento_aplicado,
                    'precio_pagado'      => (float) $producto->pivot->precio_pagado,
                ];
            })->values(),
        ];
    }

    /** @return array<string, mixed> */
    private function mapPedidoForGestor(Pedido $pedido): array
    {
        $resolveImagen = $this->makeImageResolver();
        $productos     = $pedido->productos;

        $items = $productos->map(function (Producto $producto) use ($resolveImagen) {
            $cantidad     = (int) $producto->pivot->cantidad;
            $precioPagado = (float) $producto->pivot->precio_pagado;

            return [
                'id'                 => $producto->id,
                'nombre'             => $producto->nombre,
                'imagen'             => $resolveImagen($producto),
                'cantidad'           => $cantidad,
                'precio_pagado'      => $precioPagado,
                'descuento_aplicado' => (float) $producto->pivot->descuento_aplicado,
                'subtotal'           => round($precioPagado * $cantidad, 2),
            ];
        })->values()->all();

        return [
            'id'                 => $pedido->id,
            'precio_total'       => (float) $pedido->precio_total,
            'pagado'             => (bool) $pedido->pagado,
            'payment_status'     => (bool) $pedido->pagado ? 'confirmed' : 'pending',
            'entregado'          => (bool) $pedido->entregado,
            'payment_method'     => $pedido->payment_method,
            'proof_uploaded_at'  => $pedido->proof_uploaded_at?->toIso8601String(),
            'created_at'         => $pedido->created_at?->toIso8601String(),
            'total_articulos'    => (int) $productos->sum(fn ($p) => (int) $p->pivot->cantidad),
            'productos_preview'  => $productos->take(3)->pluck('nombre')->values()->all(),
            'productos'          => $items,
            'usuario'            => [
                'nombre'   => $pedido->usuario?->nombre,
                'apellido' => $pedido->usuario?->apellido,
                'telefono' => $pedido->usuario?->telefono,
                'email'    => $pedido->usuario?->email,
            ],
        ];
    }

    private function makeImageResolver(): \Closure
    {
        return static function (Producto $producto): ?string {
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
    }
}
