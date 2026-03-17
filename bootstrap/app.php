<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use App\Http\Middleware\VerificarAdmin; // Importar el nuevo middleware (¡CLAVE!)
use App\Http\Middleware\VerificarTaquilla; 


return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php', // Asegurarse de que esta línea esté, si usas rutas API
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        
        // Middlewares para el grupo 'web' (Inertia/Breeze)
        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
            \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
        ]);

        // Registramos el alias 'admin' para nuestro middleware de seguridad
        $middleware->alias([
            'admin' => VerificarAdmin::class, // Usa el import de arriba
            'verificarTaquilla' => VerificarTaquilla::class, // <-- PASO 2: Registrar el alias de Taquilla (¡NUEVO!)

        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
