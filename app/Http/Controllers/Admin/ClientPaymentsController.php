<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Payments\ClientPaymentHistoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

/**
 * Admin · Pagos · Clientes: listado de clientes con historial de pagos por
 * acordeón. El listado solo trae datos ligeros (nombre/email/nº pagos); el
 * detalle completo de cada cliente se pide a demanda vía {@see history()}
 * cuando el admin lo despliega — nunca se precarga para todos a la vez.
 */
final class ClientPaymentsController extends Controller
{
    public function __construct(
        private readonly ClientPaymentHistoryService $paymentHistory,
    ) {}

    public function index(Request $request): InertiaResponse
    {
        $search = trim((string) $request->query('search', ''));

        $paginator = User::query()
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($sub) use ($search) {
                    $sub->where('nombre', 'like', "%{$search}%")
                        ->orWhere('apellido', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('telefono', 'like', "%{$search}%");
                });
            })
            ->orderBy('nombre')
            ->orderBy('apellido')
            ->paginate(30, ['id', 'nombre', 'apellido', 'email', 'telefono', 'is_vip'])
            ->withQueryString();

        $counts = $this->paymentHistory->confirmedPaymentCountsForUsers(collect($paginator->items()));

        $clients = collect($paginator->items())
            ->map(fn (User $user) => [
                'id' => $user->id,
                'name' => trim(($user->nombre ?? '').' '.($user->apellido ?? '')) ?: $user->email,
                'email' => $user->email,
                'phone' => $user->telefono,
                'is_vip' => (bool) $user->is_vip,
                'payment_count' => $counts[$user->id] ?? 0,
            ])
            ->values();

        return Inertia::render('Admin/Payments/Clients', [
            'clients' => $clients,
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'total' => $paginator->total(),
            ],
            'filters' => [
                'search' => $search,
            ],
        ]);
    }

    /** Endpoint JSON perezoso: se llama solo cuando el admin despliega el acordeón de un cliente. */
    public function history(User $user): JsonResponse
    {
        return response()->json([
            'rows' => $this->paymentHistory->historyForUser($user),
        ]);
    }
}
