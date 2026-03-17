<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use App\Models\User;
use App\Models\PlanTaquilla;
use App\Models\PagoCuota;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB; 
use Illuminate\Support\Facades\Log;





class PlanesTaquillasController extends Controller
{
    /**
     * LADO DEL ADMINISTRADOR:
     * PANEL DE ADMINISTRADOR DE TA1QUILLAS Y PAGOS DE LOS USUARIOS DERIVA PLANEStAQUILLASADMIN.JSX:
     * Muestra la lista de planes activos y usuarios con sus planes.
     */
 public function AdminIndex()
{
    if (!Auth::check()) {
        return redirect()->route('login')
            ->with('error', 'Debes iniciar sesión para acceder al panel de administración.');
    }

    $user = Auth::user();

    if ($user->role !== 'admin') {
        return redirect()->route('taquilla.index.client')
            ->with('error', 'No tienes permisos para acceder al panel de administración.');
    }

    $planes = PlanTaquilla::where('activo', true)->get();

    // Cargamos relaciones necesarias
    $usuarios = User::with([
        'planVigente',
        'pagosCuotas' => function ($q) {
            $q->orderByDesc('periodo_inicio');
        }
    ])->get()->map(function ($u) {
        $ultimoPago = $u->pagosCuotas->first();

        $diasRestantes = null;
        $estado = 'sin plan';
        $ultimoPagoStr = null;
        $fechaFinStr = null;

        if ($ultimoPago && $ultimoPago->periodo_fin) {
            $fechaFin = Carbon::parse($ultimoPago->periodo_fin);
            $diasRestantes = now()->diffInDays($fechaFin, false);
            $estado = $diasRestantes >= 0 ? 'activo' : 'vencido';

            // Convertimos a strings simples para React
            $ultimoPagoStr = optional($ultimoPago->periodo_inicio)->toDateString(); // YYYY-MM-DD
            $fechaFinStr = optional($ultimoPago->periodo_fin)->toDateString();      // YYYY-MM-DD
        }

        return [
            'id' => $u->id,
            'nombre' => $u->nombre,
            'apellido' => $u->apellido,
            'numeroTaquilla' => $u->numeroTaquilla,
            'plan_vigente' => $u->planVigente
                ? [
                    'id' => $u->planVigente->id,
                    'nombre' => $u->planVigente->nombre,
                    'duracion_dias' => $u->planVigente->duracion_dias,
                  ]
                : null,
            'ultimo_pago' => $ultimoPagoStr,
            'fecha_fin' => $fechaFinStr,
            'dias_restantes' => $diasRestantes,
            'estado' => $estado,
        ];
    });
    return Inertia::render('PlanesTaquillasAdmin', [
        'planes' => $planes,
        'usuarios' => $usuarios,
        'flash' => [
            'success' => session('success'),
            'error' => session('error'),
        ],
    ]);
}




//MOSTRAR detalles DEL USUARIO EN EL PANEL DE CLIENTE AL CLICAR EN "MI PERFIL"

public function obtenerContactoUsuario($id)
{
    $admin = Auth::user();
    if (!$admin || $admin->role !== 'admin') {
        abort(403, 'No autorizado');
    }

    $usuario = User::findOrFail($id);

    return response()->json([
        'telefono' => $usuario->telefono,
        'email' => $usuario->email,
    ]);
}



    /**
     * LADO DEL CLIENTE:
     * PANEL DEL CLIENTE DE TAQUILLA Y PAGOS DE SUS PLANES DERIVA PLANESTAQUILLASCLIENT.JSX:
     * Muestra la lista de planes activos y   su historial de planes.
     */



public function ClientIndex()
{
    if (!Auth::check()) {
        return redirect()->route('login')->with('error', 'Debes iniciar sesión para ver tu taquilla.');
    }

    $user = Auth::user();
    $user->load(['planVigente', 'pagosCuotas.plan']);

    $diasRestantes = null;
    if ($user->fecha_vencimiento_cuota) {
        $vencimiento = \Carbon\Carbon::parse($user->fecha_vencimiento_cuota);
        $diasRestantes = $vencimiento->diffInDays(\Carbon\Carbon::now(), false);
    }

    $planes = PlanTaquilla::where('activo', true)
        ->select('id', 'nombre', 'duracion_dias', 'precio_total')
        ->orderBy('precio_total', 'asc')
        ->get();

    $ultimoPago = $user->pagosCuotas->sortByDesc('periodo_fin')->first();

    $historialPagos = $user->pagosCuotas->map(function ($pago) {
        return [
            'id' => $pago->id,
            'monto_pagado' => $pago->monto_pagado,
            'referencia_pago_externa' => $pago->referencia_pago_externa,
            'periodo_inicio' => optional($pago->periodo_inicio)->toDateString(),
            'periodo_fin' => optional($pago->periodo_fin)->toDateString(),
            'plan' => [
                'id' => $pago->plan->id ?? null,
                'nombre' => $pago->plan->nombre ?? null,
            ],
        ];
    });

    $userPlanData = [
        'id' => $user->id,
        'nombre_completo' => "{$user->nombre} {$user->apellido}",
        'numero_taquilla' => $user->numeroTaquilla,
        'vencimiento_cuota' => $user->fecha_vencimiento_cuota,
        'dias_restantes' => $diasRestantes,
        'plan_vigente' => $user->planVigente ? [
            'nombre' => $user->planVigente->nombre,
            'precio' => $user->planVigente->precio_total,
            'descripcion' => $user->planVigente->descripcion ?? null,
        ] : null,
        'ultimo_plan_fin' => optional($ultimoPago)->periodo_fin,
        'historial_pagos' => $historialPagos,
    ];

    return Inertia::render('PlanesTaquillasClient', [
        'userData' => $userPlanData,
        'planes' => $planes,
    ]);
}



public function registrarPago(Request $request)
{
    $user = Auth::user();

    // 1. Validación
    try {
        $validatedData = $request->validate([
            'plan_id' => 'required|exists:planes_taquilla,id',
            // El frontend NO es fuente de verdad del precio. Si lo envía, solo se usa para comparar.
            'monto_pagado' => 'nullable|numeric|min:0',
            'referencia_pago_externa' => 'required|string|max:255',
        ]);
    } catch (ValidationException $e) {
        return response()->json([
            'success' => false,
            'mensaje' => 'Error de validación de datos.',
            'errores' => $e->errors(),
        ], 422);
    }

    try {
        // Obtener plan
        $plan = PlanTaquilla::findOrFail($validatedData['plan_id']);
        $precioRealPlan = (float) $plan->precio_total;

        // Blindaje: si el cliente envía monto, debe coincidir con el real.
        if (array_key_exists('monto_pagado', $validatedData) && $validatedData['monto_pagado'] !== null) {
            $montoCliente = (float) $validatedData['monto_pagado'];
            $epsilon = 0.01;
            if (abs($montoCliente - $precioRealPlan) > $epsilon) {
                return response()->json([
                    'success' => false,
                    'mensaje' => 'Discrepancia detectada en el importe del pago.',
                    'errores' => [
                        'monto_pagado' => ['El importe no coincide con el precio real del plan.'],
                    ],
                ], 422);
            }
        }

        // --- CALCULAR FECHA DE INICIO ---
        // Obtenemos el último pago del usuario, aunque esté vencido
        $ultimoPago = PagoCuota::where('user_id', $user->id)
            ->orderBy('periodo_fin', 'desc')
            ->first();

        $now = now()->startOfDay();

        if ($ultimoPago) {
            $fechaInicio = Carbon::parse($ultimoPago->periodo_fin)->addDay()->startOfDay();
        } else {
            $fechaInicio = $now;
        }

        // Fecha de fin
        $fechaFin = (clone $fechaInicio)->addDays($plan->duracion_dias)->subDay()->endOfDay();

        DB::beginTransaction();

        // --- CREAR PAGO ---
        $pago = PagoCuota::create([
            'user_id' => $user->id,
            'id_plan_pagado' => $plan->id,
            // Fuente de verdad: precio en BD.
            'monto_pagado' => $precioRealPlan,
            'referencia_pago_externa' => $validatedData['referencia_pago_externa'],
            'periodo_inicio' => $fechaInicio,
            'periodo_fin' => $fechaFin,
            'fecha_pago' => now(),
        ]);


        //buscamos el plan activo del usuario 
      $now = now();
        $planVigente = PagoCuota::where('user_id', $user->id)
            ->where('periodo_inicio', '<=', $now)
            ->where('periodo_fin', '>=', $now)
            ->orderByDesc('periodo_fin')
            ->with('plan') // relación con la tabla de planes
            ->first();

        if ($planVigente) {
            $diasRestantes = $now->diffInDays($planVigente->periodo_fin);
            $planInfo = [
                'nombre' => $planVigente->plan->nombre,
                'precio' => $planVigente->plan->precio,
                'dias_restantes' => $diasRestantes,
                'fecha_fin' => $planVigente->periodo_fin,
            ];
        } else {
            $planInfo = null;
        }

        $user->update([
            'fecha_vencimiento_cuota' => $planVigente?->periodo_fin,
            'id_plan_vigente' => $planVigente?->id_plan_pagado,
        ]);

        DB::commit();

       // --- OBTENER HISTORIAL ACTUALIZADO ---
        $historial = PagoCuota::where('user_id', $user->id)
            ->with('plan') // Relación con PlanTaquilla
            ->orderBy('periodo_inicio', 'desc')
            ->get();

            // Respuesta JSON
       return response()->json([
                'success' => true,
                'mensaje' => 'Pago registrado y cuota actualizada con éxito.',
                'pago' => [
                    'id' => $pago->id,
                    'plan' => [
                        'id' => $plan->id,
                        'nombre' => $plan->nombre,
                        'duracion_dias' => $plan->duracion_dias,
                    ],
                    'monto_pagado' => $pago->monto_pagado,
                    'referencia_pago_externa' => $pago->referencia_pago_externa,
                    'periodo_inicio' => $pago->periodo_inicio->toDateString(),
                    'periodo_fin' => $pago->periodo_fin->toDateString(),
                    'fecha_pago' => $pago->fecha_pago->toDateTimeString(),
                ],
                'vencimiento_actualizado' => $user->fecha_vencimiento_cuota?->toDateString(),
                'plan_vigente' => $planVigente ? [
                    'nombre' => $planVigente->plan->nombre,
                    'precio' => $planVigente->plan->precio,
                    'dias_restantes' => $now->diffInDays($planVigente->periodo_fin, false),
                    'fecha_fin' => $planVigente->periodo_fin->toDateString(),
                ] : null,
                'historial' => $historial,
          ]);
                    

    } catch (QueryException $e) {
        DB::rollBack();
        Log::error("FALLO CRÍTICO EN TRANSACCIÓN DE PAGO (DB):", [
            'error_mensaje' => $e->getMessage(),
            'user_id' => $user->id,
        ]);

        return response()->json([
            'success' => false,
            'mensaje' => 'Error de Base de Datos al intentar guardar el pago.',
        ], 500);

    } catch (Throwable $e) {
        DB::rollBack();
        Log::error("FALLO CRÍTICO EN TRANSACCIÓN DE PAGO (INESPERADO):", [
            'error_mensaje' => $e->getMessage(),
            'trace' => $e->getTraceAsString(),
            'user_id' => $user->id,
        ]);

        return response()->json([
            'success' => false,
            'mensaje' => 'Error inesperado del servidor al procesar el pago.',
        ], 500);
    }
}



//para cargr los datso del cliente en client admins pagostaquillas
public function obtenerDatosUsuario()
{
    $user = Auth::user();

    try {
        // Obtener plan vigente
        $now = now();
        $planVigente = PagoCuota::where('user_id', $user->id)
            ->where('periodo_inicio', '<=', $now)
            ->where('periodo_fin', '>=', $now)
            ->orderByDesc('periodo_fin')
            ->with('plan')
            ->first();

        $diasRestantes = $planVigente ? $now->diffInDays($planVigente->periodo_fin, false) : 0;

        // Historial completo
        $historial = PagoCuota::where('user_id', $user->id)
            ->with('plan')
            ->orderBy('periodo_inicio', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'nombre_completo' => $user->name, // o como tengas el campo
            'numero_taquilla' => $user->numero_taquilla,
            'vencimiento_actualizado' => $user->fecha_vencimiento_cuota?->toDateString(),
            'plan_vigente' => $planVigente ? [
                'nombre' => $planVigente->plan->nombre,
                'precio' => $planVigente->plan->precio,
                'dias_restantes' => $diasRestantes,
                'fecha_fin' => $planVigente->periodo_fin->toDateString(),
            ] : null,
            'historial' => $historial,
            'ultimo_plan_fin' => $user->fecha_vencimiento_cuota?->toDateString(),
        ]);
    } catch (Throwable $e) {
        Log::error("Error al obtener datos del usuario:", [
            'error_mensaje' => $e->getMessage(),
            'user_id' => $user->id,
        ]);

        return response()->json([
            'success' => false,
            'mensaje' => 'Error al cargar los datos del usuario.',
        ], 500);
    }
}




}