<?php

namespace App\Providers;

use App\Actions\Payments\InitiatePaymentAction;
use App\Contracts\Invoicing\FiscalInvoiceIssuerInterface;
use App\Contracts\Payments\FindsOpenCheckout;
use App\Contracts\Payments\StartsCheckout;
use App\Services\Payments\PaymentGatewayService;
use App\Events\Payments\PaymentConfirmed;
use App\Events\LessonRequestedEvent;
use App\Events\PrivateLessonRequestedEvent;
use App\Events\SoloStudentLocked;
use App\Events\Taquilla\PagoTaquillaConfirmado;
use App\Listeners\Payments\DispatchB2BRouterInvoiceListener;
use App\Listeners\Payments\DispatchStripeReceiptCaptureListener;
use App\Listeners\SendLessonRequestedMailListener;
use App\Listeners\SendPrivateLessonRequestedMailListener;
use App\Listeners\SendSoloStudentNotification;
use App\Listeners\Taquilla\EnviarCorreoConfirmacionTaquilla;
use App\Models\Article;
use App\Models\Lesson;
use App\Models\Producto;
use App\Models\SecondHandBoard;
use App\Models\Surfboard;
use App\Models\User;
use App\Observers\LessonObserver;
use App\Observers\SitemapCacheObserver;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use Inertia\Inertia;


class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Facturación fiscal (TicketBAI): driver configurable vía INVOICING_DRIVER.
        $this->app->bind(StartsCheckout::class, InitiatePaymentAction::class);
        $this->app->bind(FindsOpenCheckout::class, PaymentGatewayService::class);

        $this->app->bind(FiscalInvoiceIssuerInterface::class, function ($app) {
            $driver = config('invoicing.driver', 'b2brouter');

            return match ($driver) {
                'b2brouter' => new \App\Services\Invoicing\B2BRouterFiscalInvoiceIssuer(
                    $app->make(\App\Services\Invoicing\B2BRouterClient::class)
                ),
                default => throw new \RuntimeException("Driver de facturación no soportado: {$driver}"),
            };
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Lesson::observe(LessonObserver::class);
        Article::observe(SitemapCacheObserver::class);
        Producto::observe(SitemapCacheObserver::class);
        SecondHandBoard::observe(SitemapCacheObserver::class);
        Surfboard::observe(SitemapCacheObserver::class);
        Event::listen(SoloStudentLocked::class, SendSoloStudentNotification::class);
        Event::listen(LessonRequestedEvent::class, SendLessonRequestedMailListener::class);
        Event::listen(PrivateLessonRequestedEvent::class, SendPrivateLessonRequestedMailListener::class);
        Event::listen(PagoTaquillaConfirmado::class, EnviarCorreoConfirmacionTaquilla::class);
        Event::listen(PaymentConfirmed::class, DispatchStripeReceiptCaptureListener::class);
        Event::listen(PaymentConfirmed::class, DispatchB2BRouterInvoiceListener::class);

        Vite::prefetch(concurrency: 3);

        // Dev Tunnels: rutas relativas en CSS/JS evitan ERR_CERT_AUTHORITY_INVALID en assets absolutos.
        if (filter_var(env('TUNNEL_SHARE', false), FILTER_VALIDATE_BOOLEAN)) {
            Vite::createAssetPathsUsing(static fn (string $path, ?bool $secure = null) => '/'.ltrim($path, '/'));
        }

        Inertia::setRootView('app');

        Relation::morphMap([
            'lesson_user' => \App\Models\LessonUser::class,
            'booking' => \App\Models\Booking::class,
        ]);

        Gate::define('manage-vips', static function (?User $user): bool {
            return $user !== null && ($user->role ?? '') === 'admin';
        });
    }
}
