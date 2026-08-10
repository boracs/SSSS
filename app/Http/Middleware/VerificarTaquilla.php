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

        // VIP con taquilla compartida (#500, #600…): tienda con descuento sin cuota de casillero.
        if ($user->hasSharedLocker()) {
            return $next($request);
        }

        // 2. Verificar si el usuario tiene asignado un número de taquilla física.
        if (! $user->hasPhysicalLocker()) {
            return redirect()->route('tienda')->with(
                'access_alert',
                'Debes tener una taquilla asignada para acceder al carrito y completar pedidos.',
            );
        }

        // 3. Cuota al día: obligatorio para compras; la renovación sigue accesible.
        $renewalRoutes = [
            'taquillas.pago.client',
            'taquillas.pago.pay',
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
                ->with(
                    'access_alert',
                    'Tu cuota de taquilla está vencida. Renueva tu plan para seguir usando el carrito y los servicios del club.',
                );
        }

        return $next($request);
    }
}
