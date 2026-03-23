<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class UserController extends Controller
{
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
        $user->is_vip = ! (bool) $user->is_vip;
        $user->save();

        return back()->with('success', "Estado VIP actualizado para {$user->email}.");
    }
}

