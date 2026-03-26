<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PackBono;
use App\Models\User;
use App\Models\UserBono;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class BonoController extends Controller
{
    public function index()
    {
        return Inertia::render('Admin/Bonos/Index', [
            'packs' => PackBono::query()->orderByDesc('id')->get(),
            'vipUsers' => User::query()
                ->where('is_vip', true)
                ->orderBy('nombre')
                ->orderBy('apellido')
                ->get(['id', 'nombre', 'apellido', 'email']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'nombre' => 'required|string|max:120',
            'num_clases' => 'required|integer|min:1|max:500',
            'precio' => 'required|numeric|min:0',
            'activo' => 'nullable|boolean',
        ]);

        PackBono::create([
            'nombre' => $validated['nombre'],
            'num_clases' => (int) $validated['num_clases'],
            'precio' => $validated['precio'],
            'activo' => (bool) ($validated['activo'] ?? true),
        ]);

        return back()->with('success', 'Pack bono creado.');
    }

    public function update(Request $request, PackBono $packBono)
    {
        abort(403, 'Edición directa deshabilitada. Para cambiar tarifa, desactiva el pack y crea una nueva versión.');
    }

    public function destroy(PackBono $packBono)
    {
        abort(403, 'Eliminación física deshabilitada para preservar la integridad histórica.');
    }

    public function assignManual(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'required|integer|exists:users,id',
            'pack_id' => 'required|integer|exists:pack_bonos,id',
            'admin_notes' => 'nullable|string|max:2000',
        ]);

        $user = User::query()->findOrFail((int) $validated['user_id']);
        if (! (bool) $user->is_vip) {
            return back()->with('error', 'Solo se pueden asignar bonos manuales a usuarios VIP.');
        }

        $pack = PackBono::query()->findOrFail((int) $validated['pack_id']);
        $isAdmin = (string) ($request->user()?->role ?? '') === 'admin';
        if (! (bool) $pack->activo && ! $isAdmin) {
            return back()->with('error', 'El pack seleccionado está inactivo.');
        }

        UserBono::create([
            'user_id' => $user->id,
            'pack_id' => $pack->id,
            'clases_restantes' => (int) $pack->num_clases,
            'status' => UserBono::STATUS_CONFIRMED,
            'admin_notes' => trim((string) ($validated['admin_notes'] ?? 'Asignación manual por admin')),
        ]);

        return back()->with('success', 'Bono asignado manualmente y confirmado.');
    }

    public function toggleActive(Request $request, PackBono $packBono)
    {
        $actor = $request->user();
        $old = (bool) $packBono->activo;
        $packBono->update([
            'activo' => ! $old,
        ]);

        if ($old && ! (bool) $packBono->activo) {
            Log::info('[PackBono] desactivado', [
                'pack_id' => $packBono->id,
                'pack_nombre' => $packBono->nombre,
                'admin_id' => $actor?->id,
                'admin_email' => $actor?->email,
                'at' => now()->toDateTimeString(),
            ]);
        }

        return back()->with('success', $packBono->activo ? 'Pack activado.' : 'Pack desactivado.');
    }
}

