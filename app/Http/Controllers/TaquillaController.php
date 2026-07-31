<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use App\Models\User;
use App\Support\VipVirtualLocker;
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
                'is_vip',
            ]);

        return Inertia::render('AsignarTaquilla', [
            'usuarios' => $usuarios,
            'success' => $success,
            'sharedLockerNumbers' => VipVirtualLocker::sharedNumbers(),
        ]);
    }

    public function AsignarTaquilla(Request $request)
    {
        $request->validate([
            'usuario_id' => 'required|integer|exists:users,id',
            'numero_taquilla' => 'required|integer|min:1|max:9999',
        ]);

        $numero = (int) $request->numero_taquilla;
        $newUserName = null;

        DB::transaction(function () use ($request, $numero, &$newUserName) {
            if (VipVirtualLocker::allowsMultipleAssignments($numero)) {
                $usuario = User::query()
                    ->whereKey((int) $request->usuario_id)
                    ->lockForUpdate()
                    ->firstOrFail();
                $usuario->numeroTaquilla = $numero;
                $usuario->save();
                $newUserName = trim(($usuario->nombre ?? '').' '.($usuario->apellido ?? ''));

                return;
            }

            $ocupante = User::query()
                ->where('numeroTaquilla', $numero)
                ->lockForUpdate()
                ->first();

            // Solo se permite si está libre o ya es del mismo usuario (cambio a otra libre se hace
            // actualizando su numeroTaquilla; la anterior queda libre al dejar de referenciarse).
            if ($ocupante && (int) $ocupante->id !== (int) $request->usuario_id) {
                abort(422, 'Esa taquilla ya está asignada a otro usuario.');
            }

            $usuario = User::query()
                ->whereKey((int) $request->usuario_id)
                ->lockForUpdate()
                ->firstOrFail();
            $usuario->numeroTaquilla = $numero;
            $usuario->save();
            $newUserName = trim(($usuario->nombre ?? '').' '.($usuario->apellido ?? ''));
        });

        $newLabel = $newUserName !== null && $newUserName !== '' ? $newUserName : 'el nuevo socio';

        return back()->with(
            'success',
            "Taquilla #{$numero} asignada correctamente a {$newLabel}."
        );
    }

    public function liberarTaquilla(Request $request, User $user)
    {
        $request->validate([
            'desasignar_vip' => 'sometimes|boolean',
        ]);

        $desasignarVip = $request->boolean('desasignar_vip');
        $vipRemoved = false;

        DB::transaction(function () use ($user, $desasignarVip, &$vipRemoved) {
            $target = User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();
            $target->numeroTaquilla = null;

            if ($desasignarVip && (bool) $target->is_vip) {
                $target->is_vip = false;
                $vipRemoved = true;
            }

            $target->save();
        });

        $message = $vipRemoved
            ? 'Taquilla liberada y VIP desactivado correctamente.'
            : 'Taquilla liberada correctamente.';

        return back()->with('success', $message);
    }

    public function listaUsuarios()
    {
        $usuarios = User::query()
            ->orderByRaw('numeroTaquilla IS NULL')
            ->orderBy('numeroTaquilla')
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

        return Inertia::render('ListaUsuarios', [
            'usuarios' => $usuarios,
        ]);
    }
}
