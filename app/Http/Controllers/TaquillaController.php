<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TaquillaController extends Controller
{


    public function showForm($success = null)
    {
        $usuarios = User::query()
            ->orderBy('nombre')
            ->orderBy('apellido')
            ->get([
                'id',
                'nombre',
                'apellido',
                'email',
                'telefono',
                'numeroTaquilla',
            ]);

        return Inertia::render('AsignarTaquilla', [
            'usuarios' => $usuarios,
            'success' => $success,
        ]);
    }

    public function AsignarTaquilla(Request $request)
    {
        $request->validate([
            'usuario_id' => 'required|integer|exists:users,id',
            'numero_taquilla' => 'required|integer|min:1|max:9999',
        ]);

        DB::transaction(function () use ($request) {
            $numero = (int) $request->numero_taquilla;

            $ocupante = User::query()
                ->where('numeroTaquilla', $numero)
                ->lockForUpdate()
                ->first();
            if ($ocupante && (int) $ocupante->id !== (int) $request->usuario_id) {
                abort(422, 'Esa taquilla ya está asignada a otro usuario.');
            }

            $usuario = User::query()
                ->whereKey((int) $request->usuario_id)
                ->lockForUpdate()
                ->firstOrFail();
            $usuario->numeroTaquilla = $numero;
            $usuario->save();
        });

        return back()->with('success', 'Taquilla asignada correctamente.');
    }

    public function liberarTaquilla(User $user)
    {
        DB::transaction(function () use ($user) {
            $target = User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();
            $target->numeroTaquilla = null;
            $target->save();
        });

        return back()->with('success', 'Taquilla liberada correctamente.');
    }
}