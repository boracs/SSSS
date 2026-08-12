<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

/**
 * Exige email verificado en rutas admin cuando auth.admin_require_email_verified=true.
 * Allowlist opcional: config('auth.admin_emergency_emails') (ADMIN_EMERGENCY_EMAILS en .env).
 * Debe ir después del middleware `admin` (rol ya comprobado).
 */
final class EnsureAdminVerified
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! config('auth.admin_require_email_verified', false)) {
            return $next($request);
        }

        $user = $request->user();
        if ($user === null) {
            return $next($request);
        }

        if ($user->hasVerifiedEmail()) {
            return $next($request);
        }

        $email = strtolower(trim((string) $user->email));
        /** @var list<string> $allowlist */
        $allowlist = config('auth.admin_emergency_emails', []);

        if ($email !== '' && in_array($email, $allowlist, true)) {
            Log::warning('Admin emergency access without verified email', [
                'user_id' => $user->id,
                'email' => $email,
                'path' => $request->path(),
            ]);

            return $next($request);
        }

        if ($request->expectsJson()) {
            return response()->json([
                'message' => 'Debes verificar tu email antes de acceder al panel de administración.',
            ], 403);
        }

        return redirect()->route('verification.notice');
    }
}
