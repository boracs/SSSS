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

        $renewalRoutes = [
            'taquillas.pago.client',
            'taquillas.pago.pay',
            'taquillas.pago.proof',
            'emergency-key.show',
            'emergency-key.request',
        ];

        // VIP (#500 virtual o is_vip) o socio con taquilla física al día.
        if ($user->canAccessStoreWithMemberDiscount()) {
            return $next($request);
        }

        if ($request->routeIs(...$renewalRoutes) && $user->hasPhysicalLocker()) {
            return $next($request);
        }

        if ($user->hasPhysicalLocker() && ! $user->isLockerPaymentUpToDate()) {
            return redirect()
                ->route('taquillas.index.client')
                ->with(
                    'access_alert',
                    'Tu cuota de taquilla está vencida. Renueva tu plan para seguir usando el carrito y los servicios del club.',
                );
        }

        return redirect()->route('tienda')->with(
            'access_alert',
            'Debes tener una taquilla asignada para acceder al carrito y completar pedidos.',
        );
    }
}
