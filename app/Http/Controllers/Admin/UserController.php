<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Vip\VipMembershipService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class UserController extends Controller
{
    public function __construct(
        private readonly VipMembershipService $vipMembershipService,
    ) {}

    public function index(Request $request)
    {
        $search = trim((string) $request->query('search', ''));
        $vip = (string) $request->query('vip', 'all'); // all|vip|non_vip

        $users = User::query()
            ->when($search !== '', function ($q) use ($search) {
                $q->where(function ($sub) use ($search) {
                    $sub->where('nombre', 'like', "%{$search}%")
                        ->orWhere('apellido', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->when($vip === 'vip', fn ($q) => $q->where('is_vip', true))
            ->when($vip === 'non_vip', fn ($q) => $q->where('is_vip', false))
            ->orderBy('nombre')
            ->orderBy('apellido')
            ->limit(500)
            ->get(['id', 'nombre', 'apellido', 'email', 'role', 'is_vip', 'created_at']);

        return Inertia::render('Admin/Users/Index', [
            'users' => $users,
            'filters' => [
                'search' => $search,
                'vip' => $vip,
            ],
        ]);
    }

    public function toggleVip(User $user)
    {
        $updated = $this->vipMembershipService->toggle($user);

        if ((bool) $updated->is_vip) {
            return back()->with('success', "Usuario VIP activado para {$updated->email}. Asigna taquilla compartida (#500/#600) desde el mapa si necesita descuento en tienda.");
        }

        return back()->with('success', "VIP desactivado para {$updated->email}.");
    }
}

