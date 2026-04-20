<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;

class RouteServiceProvider extends ServiceProvider
{
    /**
     * Define the routes for the application.
     */
    public function boot(): void
    {
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('contact-form', function (Request $request) {
            $email = strtolower(trim((string) $request->input('email', '')));
            $emailKey = $email !== '' ? $email : 'no-email';
            $ip = (string) $request->ip();

            return [
                Limit::perMinute(3)->by("contact:ip-email:{$ip}:{$emailKey}"),
                Limit::perMinute(10)->by("contact:ip:{$ip}"),
            ];
        });

        $this->routes(function () {
            // Carga las rutas API: Aplica el middleware 'api' y el prefijo '/api'
            Route::middleware('api')
                ->prefix('api')
                ->group(base_path('routes/api.php'));

            // Carga las rutas Web
            Route::middleware('web')
                ->group(base_path('routes/web.php'));
        });
    }
}