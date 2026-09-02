<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use App\Models\User;
use App\Services\Taquilla\TaquillaMembershipService;
use App\Support\VipVirtualLocker;
use Illuminate\Http\Request;

class TaquillaController extends Controller
{
    public function __construct(
        private readonly TaquillaMembershipService $taquillaService,
    ) {}

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

        // El alta vive en el servicio: es el único sitio que sella la fecha de alta
        // (la usa el cálculo de periodo de la cuota).
        $usuario = $this->taquillaService->darDeAltaTaquilla(
            User::query()->findOrFail((int) $request->usuario_id),
            $numero,
        );

        $newUserName = trim(($usuario->nombre ?? '').' '.($usuario->apellido ?? ''));
        $newLabel = $newUserName !== '' ? $newUserName : 'el nuevo socio';

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

        // Liberar aquí también es una baja efectiva: si el club le quita la plaza,
        // no se le devengan los meses que pase fuera.
        $result = $this->taquillaService->liberarTaquilla($user, $request->boolean('desasignar_vip'));

        $message = $result->vipRemoved
            ? 'Taquilla liberada y VIP desactivado correctamente.'
            : 'Taquilla liberada correctamente.';

        return back()->with('success', $message);
    }
}
