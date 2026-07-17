<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use App\Http\Middleware\VerificarAdmin; // Importar el nuevo middleware (¡CLAVE!)
use App\Http\Middleware\VerificarTaquilla;
use App\Http\Middleware\EnsureAuctionAccess;


return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php', // Asegurarse de que esta línea esté, si usas rutas API
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // Dev Tunnels / port forwarding (HTTPS → artisan serve): confiar en el proxy inverso.
        if (env('APP_ENV', 'production') === 'local') {
            $middleware->trustProxies(at: '*');
        }

        // Middlewares para el grupo 'web' (Inertia/Breeze)
        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
            \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
        ]);

        // El webhook de Stripe usa firma HMAC propia; no necesita (ni puede tener) token CSRF.
        $middleware->validateCsrfTokens(except: [
            'webhooks/stripe',
        ]);

        // Registramos el alias 'admin' para nuestro middleware de seguridad
        $middleware->alias([
            'admin' => VerificarAdmin::class, // Usa el import de arriba
            'verificarTaquilla' => VerificarTaquilla::class, // <-- PASO 2: Registrar el alias de Taquilla (¡NUEVO!)
            'auction.access' => EnsureAuctionAccess::class,
            'role' => \App\Http\Middleware\EnsureUserHasRole::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
