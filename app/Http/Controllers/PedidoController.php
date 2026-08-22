<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Actions\Store\CreateStoreCheckoutAction;
use App\DTOs\Store\CreateStoreCheckoutDto;
use App\Models\Pedido;
use App\Models\Producto;
use App\Services\Invoicing\FiscalInvoiceAccessService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\Response;

class PedidoController extends Controller
{
    public function __construct(
        private readonly CreateStoreCheckoutAction $createStoreCheckout,
        private readonly FiscalInvoiceAccessService $fiscalInvoices,
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

        try {
            $checkoutUrl = $this->createStoreCheckout->execute(new CreateStoreCheckoutDto(
                userId: (int) $user->id,
                cartLines: $productosCarrito,
                quotedTotalEuros: $request->input('total'),
                fechaEntregaYmd: $fechaEntrega,
            ));
        } catch (\InvalidArgumentException $e) {
            return back()->with('error', $e->getMessage());
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
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
            ->where('pagado', true)
            ->with(['productos.imagenes'])
            ->orderBy('id', 'desc')
            ->get();

        $fiscalMap = $this->fiscalInvoices->mapForPayables(
            $pedidos->map(fn (Pedido $p) => ['type' => Pedido::class, 'id' => (int) $p->id])->all(),
        );

        return Inertia::render('Pedidos', [
            'pedidos' => $pedidos->map(fn ($p) => $this->mapPedidoListItem($p, $fiscalMap)),
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

    public function toggleEntregado(int $id): RedirectResponse
    {
        $pedido = Pedido::findOrFail($id);
        $pedido->entregado = ! $pedido->entregado;
        $pedido->save();

        return back()->with('success', "El pedido #{$pedido->id} fue actualizado.");
    }

    // ──────────────────────────────────────────────────────────────────────────
    // PRIVADOS
    // ──────────────────────────────────────────────────────────────────────────

    private function renderGestorPedidos(Request $request): InertiaResponse
    {
        $entregado = (string) $request->input('entregado', '');

        // Solo pedidos cobrados (pasarela). El estado operativo es la entrega.
        $query = Pedido::query()
            ->where('pagado', true)
            ->with([
                'usuario:id,nombre,apellido,telefono,email',
                'productos' => fn ($q) => $q
                    ->select('productos.id', 'nombre', 'precio')
                    ->with('imagenes:id,producto_id,ruta,es_principal')
                    ->withPivot('cantidad', 'descuento_aplicado', 'precio_pagado'),
            ])
            ->latest('id');

        if ($entregado === '1') {
            $query->where('entregado', true);
        } elseif ($entregado === '0') {
            $query->where('entregado', false);
        }

        $paginator = $query->paginate(20)->withQueryString();

        return Inertia::render('GestorPedidos', [
            'pedidos'      => collect($paginator->items())
                ->map(fn (Pedido $p) => $this->mapPedidoForGestor($p))
                ->values()
                ->all(),
            'totalPedidos' => $paginator->total(),
            'currentPage'  => $paginator->currentPage(),
            'lastPage'     => max(1, $paginator->lastPage()),
            'filters'      => ['entregado' => $entregado],
            'stats'        => [
                'total'              => Pedido::query()->where('pagado', true)->count(),
                'pendientes_entrega' => Pedido::query()->where('pagado', true)->where('entregado', false)->count(),
                'entregados'         => Pedido::query()->where('pagado', true)->where('entregado', true)->count(),
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
        $fiscal = $this->fiscalInvoices->forPayable(Pedido::class, (int) $pedido->id);

        return [
            'id'                => $pedido->id,
            'precio_total'      => (float) $pedido->precio_total,
            'subtotal'          => round($subtotalSinDescuento, 2),
            'descuentos'        => $totalDescuentos > 0 ? $totalDescuentos : 0.0,
            'entregado'         => (bool) $pedido->entregado,
            'payment_method'    => $pedido->payment_method,
            'created_at'        => optional($pedido->created_at)->toIso8601String(),
            'proof_uploaded_at' => optional($pedido->proof_uploaded_at)->toIso8601String(),
            'fiscal_invoice_url' => $fiscal?->detailUrl,
            'fiscal_invoice_pdf_url' => $fiscal?->pdfUrl,
            'fiscal_invoice_ready' => $fiscal?->isReady ?? false,
            'cliente'           => [
                'nombre'   => trim(($pedido->usuario->nombre ?? '').' '.($pedido->usuario->apellido ?? '')),
                'email'    => $pedido->usuario->email ?? null,
                'telefono' => $pedido->usuario->telefono ?? null,
            ],
            'productos' => $items,
        ];
    }

    /** @param array<string, \App\DTOs\Invoicing\FiscalInvoicePublicDto> $fiscalMap */
    private function mapPedidoListItem(Pedido $pedido, array $fiscalMap = []): array
    {
        $resolveImagen = $this->makeImageResolver();
        $fiscal = $fiscalMap[$this->fiscalInvoices->cacheKey(Pedido::class, (int) $pedido->id)] ?? null;

        return [
            'id'              => $pedido->id,
            'precio_total'    => (float) $pedido->precio_total,
            'entregado'       => (bool) $pedido->entregado,
            'payment_method'  => $pedido->payment_method,
            'created_at'      => optional($pedido->created_at)->toIso8601String(),
            'total_articulos' => (int) $pedido->productos->sum(fn ($p) => (int) $p->pivot->cantidad),
            'fiscal_invoice_url' => $fiscal?->detailUrl,
            'fiscal_invoice_pdf_url' => $fiscal?->pdfUrl,
            'fiscal_invoice_ready' => $fiscal?->isReady ?? false,
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
            'entregado'          => (bool) $pedido->entregado,
            'payment_method'     => $pedido->payment_method,
            'created_at'         => $pedido->created_at?->toIso8601String(),
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
