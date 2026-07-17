<?php

namespace App\Providers;

use App\Contracts\Invoicing\FiscalInvoiceIssuerInterface;
use App\Events\Payments\PaymentConfirmed;
use App\Events\LessonRequestedEvent;
use App\Events\LessonProofUploadedEvent;
use App\Events\PrivateLessonRequestedEvent;
use App\Events\SoloStudentLocked;
use App\Events\Taquilla\PagoTaquillaConfirmado;
use App\Events\Taquilla\PagoTaquillaRechazado;
use App\Listeners\Payments\DispatchB2BRouterInvoiceListener;
use App\Listeners\Payments\DispatchStripeReceiptCaptureListener;
use App\Listeners\SendLessonRequestedMailListener;
use App\Listeners\NotifyAdminLessonProofUploadedListener;
use App\Listeners\SendPrivateLessonRequestedMailListener;
use App\Listeners\SendSoloStudentNotification;
use App\Listeners\Taquilla\EnviarCorreoConfirmacionTaquilla;
use App\Listeners\Taquilla\EnviarCorreoRechazoTaquilla;
use App\Models\Lesson;
use App\Models\User;
use App\Observers\LessonObserver;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use Inertia\Inertia;
use Google\Cloud\Firestore\FirestoreClient; //  NECESARIA estoas dos lineas  lo hice metiend e instalando  composer require google/cloud
use Google\Cloud\Core\ServiceBuilder;      //

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // 🚨 CAMBIO: Inicialización directa de FirestoreClient para asegurar el modo REST
        $this->app->singleton(FirestoreClient::class, function ($app) {
            return new FirestoreClient([
                'projectId' => env('FIREBASE_PROJECT_ID'),
                'keyFilePath' => env('FIREBASE_CREDENTIALS'),
                'transport' => 'rest', // ¡FORZANDO REST!
            ]);
        });

        // Binding para tu servicio
        $this->app->bind(\App\Services\FirestoreService::class, function ($app) {
            return new \App\Services\FirestoreService($app->make(FirestoreClient::class));
        });

        // Facturación fiscal (TicketBAI): driver configurable vía INVOICING_DRIVER.
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
        Event::listen(SoloStudentLocked::class, SendSoloStudentNotification::class);
        Event::listen(LessonRequestedEvent::class, SendLessonRequestedMailListener::class);
        Event::listen(LessonProofUploadedEvent::class, NotifyAdminLessonProofUploadedListener::class);
        Event::listen(PrivateLessonRequestedEvent::class, SendPrivateLessonRequestedMailListener::class);
        Event::listen(PagoTaquillaConfirmado::class, EnviarCorreoConfirmacionTaquilla::class);
        Event::listen(PagoTaquillaRechazado::class, EnviarCorreoRechazoTaquilla::class);
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
