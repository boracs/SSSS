<?php


namespace App\Http\Middleware; // ESTE ES EL NAMESPACE CORRECTO

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Auth;

class VerificarTaquilla // ESTE DEBE SER EL NOMBRE DE CLASE EXACTO
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // 1. Verificar si el usuario está autenticado.
        if (!Auth::check()) {
            return redirect()->route('login');
        }

        $user = Auth::user();

        // 2. Verificar si el usuario tiene asignado un número de taquilla.
        if ($user->numeroTaquilla === null) {
            return redirect()->route('tienda')->with('error', 'Debes tener una taquilla asignada para acceder a esta funcionalidad.');
        }

        // 3. Cuota al día: obligatorio para compras; la renovación sigue accesible.
        $renewalRoutes = [
            'taquillas.index.client',
            'taquillas.pago.client',
            'taquillas.pago.upload-proof',
            'taquillas.pago.proof',
            'emergency-key.show',
            'emergency-key.request',
        ];

        if (
            ! $request->routeIs(...$renewalRoutes)
            && ! $user->isLockerPaymentUpToDate()
        ) {
            return redirect()
                ->route('taquillas.index.client')
                ->with('error', 'Tu membresía de taquilla no está al día. Renueva tu plan para seguir usando el carrito y los servicios del club.');
        }

        return $next($request);
    }
}
