<?php

namespace App\Http\Controllers;

use App\Http\Resources\PagoCuotaQueueResource;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use App\Models\User;
use App\Models\PlanTaquilla;
use App\Models\PagoCuota;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB; 
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Illuminate\Database\QueryException;
use Throwable;





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

    $planes = PlanTaquilla::query()
        ->orderByDesc('activo')
        ->orderBy('precio_total')
        ->get();

    // Cargamos relaciones necesarias
    $today = now()->startOfDay();
    $usuarios = User::with([
        'planVigente',
        'pagosCuotas' => function ($q) {
            $q->where('status', PagoCuota::STATUS_CONFIRMED)
                ->select('id', 'user_id', 'id_plan_pagado', 'periodo_inicio', 'periodo_fin', 'status')
                ->orderBy('periodo_inicio');
        }
    ])->get()->map(function ($u) use ($today) {
        $confirmedRows = $u->pagosCuotas;

        // Tramo activo (hoy dentro del rango): base operativa para "Último pago" y "Vence".
        $activeRow = $confirmedRows->first(function ($p) use ($today) {
            return $p->periodo_inicio && $p->periodo_fin
                && Carbon::parse($p->periodo_inicio)->startOfDay()->lte($today)
                && Carbon::parse($p->periodo_fin)->startOfDay()->gte($today);
        });

        $diasRestantes = null;
        $estado = 'sin plan';
        $ultimoPagoStr = null;
        $fechaFinStr = null;
        $prepaidExtraDays = 0;

        if ($activeRow && $activeRow->periodo_fin) {
            $fechaFin = Carbon::parse($activeRow->periodo_fin);
            $diasRestantes = $today->diffInDays($fechaFin, false);
            $estado = 'activo';
            $ultimoPagoStr = optional($activeRow->periodo_inicio)->toDateString();
            $fechaFinStr = optional($activeRow->periodo_fin)->toDateString();

            // Días precomprados: tramos confirmed encadenados que inician después del tramo activo.
            $prepaidExtraDays = (int) $confirmedRows
                ->filter(fn ($p) => $p->periodo_inicio && Carbon::parse($p->periodo_inicio)->startOfDay()->gt($fechaFin->startOfDay()))
                ->sum(function ($p) {
                    if (! $p->periodo_inicio || ! $p->periodo_fin) {
                        return 0;
                    }
                    $start = Carbon::parse($p->periodo_inicio)->startOfDay();
                    $end = Carbon::parse($p->periodo_fin)->startOfDay();
                    return $start->diffInDays($end) + 1;
                });
        } elseif ($u->numeroTaquilla) {
            $estado = 'vencido';
        }

        return [
            'id' => $u->id,
            'nombre' => $u->nombre,
            'apellido' => $u->apellido,
            'email' => $u->email,
            'telefono' => $u->telefono,
            'numeroTaquilla' => $u->numeroTaquilla,
            'plan_vigente' => $u->planVigente
                ? [
                    'id' => $u->planVigente->id,
                    'nombre' => $u->planVigente->nombre,
                    'duracion_dias' => $u->planVigente->duracion_dias,
                    'activo' => (bool) $u->planVigente->activo,
                  ]
                : null,
            'ultimo_pago' => $ultimoPagoStr,
            'fecha_fin' => $fechaFinStr,
            'dias_restantes' => $diasRestantes,
            'estado' => $estado,
            'prepaid_extra_days' => $prepaidExtraDays,
            'payment_status' => $activeRow?->status ?? PagoCuota::STATUS_PENDING,
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

public function userPaymentHistory(User $user)
{
    $admin = Auth::user();
    if (! $admin || ($admin->role ?? null) !== 'admin') {
        abort(403);
    }

    $rows = PagoCuota::query()
        ->with('plan:id,nombre,duracion_dias')
        ->where('user_id', $user->id)
        ->orderByDesc('periodo_inicio')
        ->limit(50)
        ->get()
        ->map(function ($p) {
            return [
                'id' => $p->id,
                'plan' => $p->plan?->nombre ?? 'Sin plan',
                'periodo_inicio' => optional($p->periodo_inicio)->toDateString(),
                'periodo_fin' => optional($p->periodo_fin)->toDateString(),
                'status' => $p->status ?? PagoCuota::STATUS_PENDING,
                'proof_url' => $p->payment_proof_path ? route('taquilla.pagos.proof', $p->id) : null,
            ];
        })
        ->values();

    return response()->json([
        'rows' => $rows,
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
            'status' => $pago->status ?? PagoCuota::STATUS_PENDING,
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

    try {
        $validatedData = $request->validate([
            'plan_id' => 'required|integer|exists:planes_taquilla,id',
            'monto_pagado' => 'nullable|numeric|min:0',
            'referencia_pago_externa' => 'nullable|string|max:255',
        ]);

        $plan = PlanTaquilla::findOrFail($validatedData['plan_id']);
        if (! (bool) $plan->activo) {
            return response()->json([
                'success' => false,
                'mensaje' => 'El plan seleccionado ya no está disponible para nuevas renovaciones.',
                'errores' => [
                    'plan_id' => ['Este plan está desactivado. Selecciona uno vigente.'],
                ],
            ], 422);
        }
        $precioRealPlan = (float) $plan->precio_total;

        // Blindaje suave de precio: si viene monto y no coincide, no se procesa.
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

        // Cola de renovaciones: siempre arranca al día siguiente del último periodo_fin.
        $ultimoPago = PagoCuota::where('user_id', $user->id)
            ->orderBy('periodo_fin', 'desc')
            ->first();

        $now = now()->startOfDay();

        if ($ultimoPago) {
            $fechaInicio = Carbon::parse($ultimoPago->periodo_fin)->addDay()->startOfDay();
        } else {
            $fechaInicio = $now;
        }

        // Fecha de fin del tramo reservado
        $fechaFin = (clone $fechaInicio)->addDays($plan->duracion_dias)->subDay()->endOfDay();

        DB::beginTransaction();

        $pago = PagoCuota::create([
            'user_id' => $user->id,
            'id_plan_pagado' => $plan->id,
            'monto_pagado' => $precioRealPlan,
            'status' => PagoCuota::STATUS_PENDING,
            'referencia_pago_externa' => $validatedData['referencia_pago_externa'] ?? null,
            'periodo_inicio' => $fechaInicio,
            'periodo_fin' => $fechaFin,
            'fecha_pago' => now(),
        ]);

        // Solo sincronizamos caché con pagos CONFIRMED (nunca con pending/submitted).
        $this->syncUserLockerCacheFromConfirmedPayments($user);

        DB::commit();

        $historial = PagoCuota::where('user_id', $user->id)
            ->with('plan')
            ->orderBy('periodo_inicio', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'mensaje' => 'Solicitud de renovación creada en estado pendiente.',
            'pago' => [
                'id' => $pago->id,
                'status' => $pago->status,
                'plan' => [
                    'id' => $plan->id,
                    'nombre' => $plan->nombre,
                    'duracion_dias' => $plan->duracion_dias,
                ],
                'monto_pagado' => $pago->monto_pagado,
                'periodo_inicio' => $pago->periodo_inicio->toDateString(),
                'periodo_fin' => $pago->periodo_fin->toDateString(),
                'fecha_pago' => $pago->fecha_pago->toDateTimeString(),
            ],
            'vencimiento_actualizado' => $user->fresh()->fecha_vencimiento_cuota?->toDateString(),
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

    } catch (ValidationException $e) {
        return response()->json([
            'success' => false,
            'mensaje' => 'Error de validación de datos.',
            'errores' => $e->errors(),
        ], 422);
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
            ->where('status', PagoCuota::STATUS_CONFIRMED)
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
            'nombre_completo' => trim(($user->nombre ?? '').' '.($user->apellido ?? '')),
            'numero_taquilla' => $user->numeroTaquilla,
            'vencimiento_actualizado' => $user->fecha_vencimiento_cuota?->toDateString(),
            'plan_vigente' => $planVigente ? [
                'nombre' => $planVigente->plan->nombre,
                'precio' => $planVigente->plan->precio_total,
                'dias_restantes' => $diasRestantes,
                'fecha_fin' => $planVigente->periodo_fin->toDateString(),
            ] : null,
            'historial' => $historial->map(fn ($p) => [
                'id' => $p->id,
                'status' => $p->status ?? PagoCuota::STATUS_PENDING,
                'monto_pagado' => $p->monto_pagado,
                'referencia_pago_externa' => $p->referencia_pago_externa,
                'periodo_inicio' => optional($p->periodo_inicio)->toDateString(),
                'periodo_fin' => optional($p->periodo_fin)->toDateString(),
                'plan' => [
                    'id' => $p->plan->id ?? null,
                    'nombre' => $p->plan->nombre ?? null,
                ],
            ]),
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




public function subirJustificante(Request $request, PagoCuota $pago)
{
    $user = Auth::user();
    if ((int) $pago->user_id !== (int) $user->id) {
        abort(403);
    }

    $request->validate([
        'proof' => 'required|file|mimes:jpeg,jpg,png,pdf|max:2048',
        'payment_method' => 'nullable|in:bizum,transferencia,tienda',
    ]);

    $oldPath = $pago->payment_proof_path;
    if ($oldPath && Storage::disk('local')->exists($oldPath)) {
        Storage::disk('local')->delete($oldPath);
    }

    $ext = strtolower((string) $request->file('proof')->getClientOriginalExtension());
    $fileName = Str::uuid()->toString().'.'.$ext;
    $path = $request->file('proof')->storeAs('taquilla-proofs/'.$pago->id, $fileName, 'local');
    $pago->update([
        'payment_proof_path' => $path,
        'proof_uploaded_at' => now(),
        'payment_method' => $request->input('payment_method'),
        'status' => PagoCuota::STATUS_SUBMITTED,
    ]);

    return back()->with('success', 'Justificante subido. Pendiente de validación.');
}

public function colaPagos(Request $request)
{
    $status = (string) $request->query('status', 'all');
    $search = trim((string) $request->query('search', ''));
    $pendingOnly = $request->boolean('pending_review', false);

    $rows = PagoCuota::query()
        ->with(['user:id,nombre,apellido,email,telefono,numeroTaquilla,fecha_vencimiento_cuota', 'plan:id,nombre,duracion_dias,precio_total'])
        ->when($status !== 'all', fn ($q) => $q->where('status', $status))
        ->when($pendingOnly, fn ($q) => $q->where('status', PagoCuota::STATUS_SUBMITTED))
        ->when($search !== '', function ($q) use ($search) {
            $q->whereHas('user', function ($u) use ($search) {
                $u->where('nombre', 'like', "%{$search}%")
                    ->orWhere('apellido', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        })
        ->orderByDesc('created_at')
        ->limit(300)
        ->get();

    $payload = [
        'rows' => PagoCuotaQueueResource::collection($rows)->resolve(),
        'counts' => [
            'all' => (int) PagoCuota::query()->count(),
            'pending' => (int) PagoCuota::query()->where('status', PagoCuota::STATUS_PENDING)->count(),
            'submitted' => (int) PagoCuota::query()->where('status', PagoCuota::STATUS_SUBMITTED)->count(),
            'confirmed' => (int) PagoCuota::query()->where('status', PagoCuota::STATUS_CONFIRMED)->count(),
        ],
        'filters' => [
            'status' => $status,
            'search' => $search,
            'pending_review' => $pendingOnly,
        ],
        'userOptions' => User::query()
            ->select('id', 'nombre', 'apellido', 'email', 'telefono', 'numeroTaquilla', 'fecha_vencimiento_cuota')
            ->orderBy('nombre')
            ->orderBy('apellido')
            ->get()
            ->map(fn ($u) => [
                'id' => $u->id,
                'name' => trim(($u->nombre ?? '').' '.($u->apellido ?? '')),
                'email' => $u->email,
                'phone' => $u->telefono,
                'locker' => $u->numeroTaquilla,
                'plan_status' => $u->isLockerPaymentUpToDate() ? 'up_to_date' : ($u->numeroTaquilla ? 'outdated' : 'no_locker'),
            ])
            ->values(),
        'lockerUsers' => User::query()
            ->whereNotNull('numeroTaquilla')
            ->orderBy('numeroTaquilla')
            ->get(['id', 'nombre', 'apellido', 'email', 'telefono', 'numeroTaquilla', 'fecha_vencimiento_cuota'])
            ->map(function ($u) {
                $today = now()->startOfDay();
                $start = optional($u->pagosCuotas()->where('status', PagoCuota::STATUS_CONFIRMED)->orderByDesc('periodo_inicio')->first()?->periodo_inicio)?->copy()?->startOfDay();
                $end = $u->fecha_vencimiento_cuota ? Carbon::parse($u->fecha_vencimiento_cuota)->startOfDay() : null;
                $progress = 0;
                if ($start && $end && $end->gte($start)) {
                    $total = max(1, $start->diffInDays($end));
                    $spent = max(0, min($total, $start->diffInDays($today, false)));
                    $progress = (int) round(($spent * 100) / $total);
                }
                return [
                    'id' => $u->id,
                    'name' => trim(($u->nombre ?? '').' '.($u->apellido ?? '')),
                    'email' => $u->email,
                    'phone' => $u->telefono,
                    'locker' => $u->numeroTaquilla,
                    'expires_at' => optional($u->fecha_vencimiento_cuota)->toDateString(),
                    'up_to_date' => $u->isLockerPaymentUpToDate(),
                    'progress' => $progress,
                ];
            })
            ->values(),
        'lockerGrid' => (function () {
            $occupied = User::query()->whereNotNull('numeroTaquilla')->pluck('numeroTaquilla')->map(fn ($n) => (int) $n)->unique()->values();
            $max = max(60, ((int) $occupied->max() + 20));
            return [
                'max' => $max,
                'occupied' => $occupied,
            ];
        })(),
    ];

    if ($request->wantsJson()) {
        return response()->json($payload);
    }

    return Inertia::render('Admin/Taquillas/Queue', [
        'pagos' => $payload,
    ]);
}

public function confirmarPagoTaquilla(Request $request, PagoCuota $pago)
{
    $validated = $request->validate([
        'locker_number' => 'nullable|integer|min:1|max:9999',
    ]);
    $admin = Auth::user();

    DB::transaction(function () use ($pago, $validated, $admin) {
        $targetUser = User::query()->whereKey($pago->user_id)->lockForUpdate()->firstOrFail();
        $lockerNumber = isset($validated['locker_number']) ? (int) $validated['locker_number'] : null;

        if (empty($targetUser->numeroTaquilla) && empty($lockerNumber)) {
            abort(422, 'Debes asignar una taquilla antes de aprobar este pago.');
        }

        if (! empty($lockerNumber)) {
            $ocupante = User::query()
                ->where('numeroTaquilla', $lockerNumber)
                ->lockForUpdate()
                ->first();
            if ($ocupante && (int) $ocupante->id !== (int) $targetUser->id) {
                abort(422, 'La taquilla seleccionada ya está ocupada. Elige otra.');
            }
            $fromLocker = $targetUser->numeroTaquilla;
            $targetUser->numeroTaquilla = $lockerNumber;
            $targetUser->save();

            DB::table('taquilla_audit_logs')->insert([
                'admin_id' => $admin?->id,
                'user_id' => $targetUser->id,
                'action' => 'assign_from_payment_approval',
                'from_locker' => $fromLocker,
                'to_locker' => $lockerNumber,
                'notes' => 'Asignación durante confirmación de pago.',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $pago->update([
            'status' => PagoCuota::STATUS_CONFIRMED,
        ]);

        $this->syncUserLockerCacheFromConfirmedPayments($targetUser);
    });

    return back()->with('success', 'Pago de taquilla confirmado.');
}

public function rechazarPagoTaquilla(Request $request, PagoCuota $pago)
{
    $validated = $request->validate([
        'admin_notes' => 'nullable|string|max:2000',
    ]);

    if (! empty($pago->payment_proof_path) && Storage::disk('local')->exists($pago->payment_proof_path)) {
        Storage::disk('local')->delete($pago->payment_proof_path);
    }

    $pago->update([
        'status' => PagoCuota::STATUS_PENDING,
        'payment_proof_path' => null,
        'proof_uploaded_at' => null,
        'payment_method' => null,
        'admin_notes' => $validated['admin_notes'] ?? 'Comprobante rechazado.',
    ]);

    return back()->with('success', 'Comprobante de taquilla rechazado.');
}

public function showProof(PagoCuota $pago)
{
    $admin = Auth::user();
    if (! $admin || (string) ($admin->role ?? '') !== 'admin') {
        abort(403);
    }

    if (empty($pago->payment_proof_path) || ! Storage::disk('local')->exists($pago->payment_proof_path)) {
        abort(404);
    }

    $mime = Storage::disk('local')->mimeType($pago->payment_proof_path);
    $stream = Storage::disk('local')->readStream($pago->payment_proof_path);

    return response()->stream(function () use ($stream) {
        fpassthru($stream);
        if (is_resource($stream)) {
            fclose($stream);
        }
    }, 200, [
        'Content-Type' => $mime ?: 'application/octet-stream',
        'Cache-Control' => 'no-store, private',
    ]);
}

private function syncUserLockerCacheFromConfirmedPayments(User $user): void
{
    $now = now();
    $planVigente = PagoCuota::where('user_id', $user->id)
        ->where('status', PagoCuota::STATUS_CONFIRMED)
        ->where('periodo_inicio', '<=', $now)
        ->where('periodo_fin', '>=', $now)
        ->orderByDesc('periodo_fin')
        ->first();

    $user->update([
        'fecha_vencimiento_cuota' => $planVigente?->periodo_fin,
        'id_plan_vigente' => $planVigente?->id_plan_pagado,
    ]);
}

public function reassignLocker(Request $request, User $user)
{
    $validated = $request->validate([
        'locker_number' => 'required|integer|min:1|max:9999',
    ]);
    $admin = Auth::user();

    DB::transaction(function () use ($validated, $user, $admin) {
        $locker = (int) $validated['locker_number'];
        $target = User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();
        $ocupante = User::query()->where('numeroTaquilla', $locker)->lockForUpdate()->first();
        if ($ocupante && (int) $ocupante->id !== (int) $target->id) {
            abort(422, 'La taquilla seleccionada ya está ocupada.');
        }
        $fromLocker = $target->numeroTaquilla;
        $target->numeroTaquilla = $locker;
        $target->save();

        DB::table('taquilla_audit_logs')->insert([
            'admin_id' => $admin?->id,
            'user_id' => $target->id,
            'action' => 'manual_reassign',
            'from_locker' => $fromLocker,
            'to_locker' => $locker,
            'notes' => 'Reasignación manual desde tabla de taquillas.',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    });

    return back()->with('success', 'Taquilla reasignada correctamente.');
}

public function storePlan(Request $request)
{
    $validated = $request->validate([
        'nombre' => 'required|string|max:100',
        'precio_total' => 'required|numeric|min:0',
        'duracion_meses' => 'required|integer|min:1|max:36',
        'visible' => 'nullable|boolean',
    ]);

    $plan = PlanTaquilla::create([
        'nombre' => $validated['nombre'],
        'precio_total' => (float) $validated['precio_total'],
        'duracion_dias' => (int) $validated['duracion_meses'] * 30,
        'activo' => (bool) ($validated['visible'] ?? true),
    ]);

    return back()->with('success', "Plan {$plan->nombre} creado correctamente.");
}

public function updatePlan(Request $request, PlanTaquilla $plan)
{
    $validated = $request->validate([
        'nombre' => 'required|string|max:100',
        'precio_total' => 'required|numeric|min:0',
        'duracion_meses' => 'required|integer|min:1|max:36',
        'visible' => 'nullable|boolean',
    ]);

    $plan->update([
        'nombre' => $validated['nombre'],
        'precio_total' => (float) $validated['precio_total'],
        'duracion_dias' => (int) $validated['duracion_meses'] * 30,
        'activo' => (bool) ($validated['visible'] ?? true),
    ]);

    return back()->with('success', "Plan {$plan->nombre} actualizado.");
}

public function togglePlanActive(PlanTaquilla $plan)
{
    $plan->update([
        'activo' => ! (bool) $plan->activo,
    ]);

    $state = $plan->activo ? 'activado' : 'desactivado';
    return back()->with('success', "Plan {$plan->nombre} {$state} correctamente.");
}

}