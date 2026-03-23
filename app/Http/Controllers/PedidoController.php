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
    //VALIDACIÓN
    $request->validate([
        'productos' => ['required', 'array', 'min:1'],
        'productos.*.id' => ['required', 'integer', 'exists:productos,id'], 
        'productos.*.cantidad' => ['required', 'integer', 'min:1'],
        'total' => ['required', 'numeric', 'min:0'], 
        'fecha_entrega' => ['nullable', 'date_format:d/m/Y'],
    ]);
    $productosCarrito = $request->input('productos');
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

        foreach ($productosCarrito as $producto) {
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
    $query = Pedido::where('id', $id_pedido)->with('productos');

    // Si no es admin, solo puede ver sus propios pedidos
    if (Auth::user()->role !== 'admin') {
        $query->where('user_id', Auth::id());
    }

    $pedido = $query->firstOrFail();

    return Inertia::render('Pedido', [
        'pedido' => $pedido,
    ]);
}


    public function mostrarPedidos(): InertiaResponse
    {
    $user_id = auth()->id();
    
    // Obtener los pedidos con sus productos y los datos de la tabla pivote, ordenados por id descendente
    $pedidos = Pedido::where('user_id', $user_id)
        ->with(['productos' => function ($query) {
            $query->select('productos.id', 'nombre', 'precio') // Campos de productos
                  ->withPivot('cantidad', 'descuento_aplicado', 'precio_pagado'); // Campos de la pivote
        }])
        ->orderBy('id', 'desc') // Ordenar por id descendente
        ->get();
    
    // Transformar los datos para incluir los timestamps
    return Inertia::render('Pedidos', [
        'pedidos' => $pedidos->map(function ($pedido) {
            return [
                'id' => $pedido->id,
                'precio_total' => $pedido->precio_total,
                'pagado' => $pedido->pagado,
                'entregado' => $pedido->entregado,
                'created_at' => $pedido->created_at->toIso8601String(), // Formato ISO
                'productos' => $pedido->productos->map(function ($producto) {
                    return [
                        'id' => $producto->id,
                        'nombre' => $producto->nombre,
                        'precio' => $producto->precio,
                        'cantidad' => $producto->pivot->cantidad,
                        'descuento_aplicado' => $producto->pivot->descuento_aplicado,
                        'precio_pagado' => $producto->pivot->precio_pagado,
                    ];
                }),
            ];
        }),
    ]);
}

//---------------------------------------------------------------------------------------------///////////////////////////////////////////////

    public function index(Request $request): InertiaResponse
    {
    // Recoger los filtros de la solicitud
    $pagado = $request->input('pagado', ''); // Valor por defecto si no se pasa el filtro
    $entregado = $request->input('entregado', ''); // Valor por defecto si no se pasa el filtro
    
    // Obtener la página actual desde la solicitud
    $page = $request->get('page', 1); // Si no se pasa, por defecto será la página 1
    
    // Iniciar la consulta base para los pedidos
    $query = Pedido::with(['productos' => function ($query) {
        $query->select('productos.id', 'nombre', 'precio')
              ->withPivot('cantidad', 'descuento_aplicado', 'precio_pagado');
    }, 'usuario']); // Relación usuario, si la necesitas
    
    // Aplicar los filtros solo si los valores no están vacíos
    if (!is_null($pagado) && $pagado !== '') {
        $query->when($pagado !== '', function ($query) use ($pagado) {
            if ($pagado === '1') {
                $query->where('pagado', true); // Filtrar por 'sí'
            } elseif ($pagado === '0') {
                $query->where('pagado', false); // Filtrar por 'no'
            }
        });
    }

    if (!is_null($entregado) && $entregado !== '') {
        $query->when($entregado !== '', function ($query) use ($entregado) {
            if ($entregado === '1') {
                $query->where('entregado', true); // Filtrar por 'sí'
            } elseif ($entregado === '0') {
                $query->where('entregado', false); // Filtrar por 'no'
            }
        });
    }
    
    // Obtener los pedidos con la paginación (5 pedidos por página)
    $pedidos = $query->paginate(5);
    
    if ($pedidos->isEmpty()) {
        Log::info('No se encontraron pedidos.');
    }
    
    // Contar el número total de pedidos
    $totalPedidos = $pedidos->total();
    
    // Devolver los pedidos con los filtros aplicados y la paginación
    return Inertia::render('GestorPedidos', [
        'pedidos' => [
            'data' => $pedidos->map(function ($pedido) {
                return [
                    'id' => $pedido->id,
                    'precio_total' => $pedido->precio_total,
                    'pagado' => $pedido->pagado,
                    'entregado' => $pedido->entregado,
                    'created_at' => $pedido->created_at->toIso8601String(),
                    'usuario' => [
                        'nombre' => $pedido->usuario->nombre,
                        'apellido' => $pedido->usuario->apellido,
                        'telefono' => $pedido->usuario->telefono,
                    ],
                    'productos' => $pedido->productos->map(function ($producto) {
                        return [
                            'id' => $producto->id,
                            'nombre' => $producto->nombre,
                            'precio' => $producto->precio,
                            'cantidad' => $producto->pivot->cantidad,
                            'descuento_aplicado' => $producto->pivot->descuento_aplicado,
                            'precio_pagado' => $producto->pivot->precio_pagado,
                        ];
                    }),
                ];
            })
        ],
        'totalPedidos' => $totalPedidos, // El total de pedidos para paginación
        'currentPage' => $pedidos->currentPage(),
        'lastPage' => $pedidos->lastPage(),
        'filters' => [
            'pagado' => $pagado,
            'entregado' => $entregado,
        ],
    ]);
}






    public function applyFilter(Request $request): InertiaResponse
    {
        // Recoger los filtros enviados desde el frontend
        $pagado = $request->input('pagado'); // Puede ser '1', '0', o ''
        $entregado = $request->input('entregado'); // Puede ser '1', '0', o ''
        $usuarioNombre = $request->input('usuarioNombre'); // Filtro adicional de nombre de usuario (si se aplica)
    
        // Filtrar los pedidos según los valores
        $pedidos = Pedido::with(['usuario']) // Cargar la relación 'usuario'
            ->when($pagado !== '', function ($query) use ($pagado) {
                if ($pagado === '1') {
                    $query->where('pagado', true); // Filtrar por 'sí'
                } elseif ($pagado === '0') {
                    $query->where('pagado', false); // Filtrar por 'no'
                }
            })
            ->when($entregado !== '', function ($query) use ($entregado) {
                if ($entregado === '1') {
                    $query->where('entregado', true); // Filtrar por 'sí'
                } elseif ($entregado === '0') {
                    $query->where('entregado', false); // Filtrar por 'no'
                }
            })
            // Filtro adicional para el nombre del usuario si es necesario
            ->when(!empty($usuarioNombre), function ($query) use ($usuarioNombre) {
                $query->whereHas('usuario', function ($q) use ($usuarioNombre) {
                    $q->where('nombre', 'like', "%{$usuarioNombre}%"); // Filtro para el nombre del usuario
                });
            })
            ->paginate(12); // Paginación de los resultados (máximo 12 pedidos por página)
    
        // Contar el total de pedidos después de aplicar los filtros
        $totalPedidos = Pedido::with(['usuario'])
            ->when($pagado !== '', function ($query) use ($pagado) {
                if ($pagado === '1') {
                    $query->where('pagado', true); // Filtrar por 'sí'
                } elseif ($pagado === '0') {
                    $query->where('pagado', false); // Filtrar por 'no'
                }
            })
            ->when($entregado !== '', function ($query) use ($entregado) {
                if ($entregado === '1') {
                    $query->where('entregado', true); // Filtrar por 'sí'
                } elseif ($entregado === '0') {
                    $query->where('entregado', false); // Filtrar por 'no'
                }
            })
            // Filtro adicional para el nombre del usuario si es necesario
            ->when(!empty($usuarioNombre), function ($query) use ($usuarioNombre) {
                $query->whereHas('usuario', function ($q) use ($usuarioNombre) {
                    $q->where('nombre', 'like', "%{$usuarioNombre}%"); // Filtro para el nombre del usuario
                });
            })
            ->count(); // Contamos el total de pedidos después de aplicar los filtros
    
        // Retornar los pedidos filtrados junto con los datos del usuario y productos
        return Inertia::render('GestorPedidos', [
            'pedidos' => $pedidos->map(function ($pedido) {
                return [
                    'id' => $pedido->id,
                    'precio_total' => $pedido->precio_total,
                    'pagado' => $pedido->pagado,
                    'entregado' => $pedido->entregado,
                    'created_at' => $pedido->created_at->toIso8601String(),
                    'usuario' => [
                        'nombre' => $pedido->usuario->nombre,
                        'apellido' => $pedido->usuario->apellido,
                        'telefono' => $pedido->usuario->telefono,
                    ],
                    'productos' => $pedido->productos->map(function ($producto) {
                        return [
                            'id' => $producto->id,
                            'nombre' => $producto->nombre,
                            'precio' => $producto->precio,
                            'cantidad' => $producto->pivot->cantidad,
                            'descuento_aplicado' => $producto->pivot->descuento_aplicado,
                            'precio_pagado' => $producto->pivot->precio_pagado,
                        ];
                    }),
                ];
            }),
            'totalPedidos' => $totalPedidos, // Retornamos el total de pedidos
            'currentPage' => $pedidos->currentPage(),
            'lastPage' => $pedidos->lastPage(),
            // Retornamos los filtros aplicados
            'filters' => [
                'pagado' => $pagado,
                'entregado' => $entregado,
                'usuarioNombre' => $usuarioNombre,
            ],
        ]);
    }
    



   // Método para alternar el estado de "pagado"
/* public function togglePagado($id)
{
    $pedido = Pedido::findOrFail($id);
    $pedido->pagado = !$pedido->pagado;
    $pedido->save();

    // Redirigir a la misma página sin renderizar toda la vista
    return Inertia::location(route('gestor.pedidos'));
}

public function toggleEntregado($id)
{
    $pedido = Pedido::findOrFail($id);
    $pedido->entregado = !$pedido->entregado;
    $pedido->save();

    // Redirigir a la misma página sin renderizar toda la vista
    return Inertia::location(route('gestor.pedidos'));
}

 */
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

















   




    
















