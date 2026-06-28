<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\Http\Foundation\Response;

class EnsureUserHasRole
{
    public function handle(Request $request, Closure $next, string $role): Response
    {
        if (! $request->user()) {
            return redirect()->route('login');
        }

        if (($request->user()->role ?? '') !== $role) {
            abort(403, 'Acceso denegado. Se requiere rol de administrador.');
        }

        return $next($request);
    }
}
