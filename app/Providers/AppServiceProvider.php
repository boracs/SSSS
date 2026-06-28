<?php

namespace App\Providers;

use App\Events\LessonRequestedEvent;
use App\Events\LessonProofUploadedEvent;
use App\Events\PrivateLessonRequestedEvent;
use App\Events\SoloStudentLocked;
use App\Events\Taquilla\PagoTaquillaConfirmado;
use App\Events\Taquilla\PagoTaquillaRechazado;
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

        Vite::prefetch(concurrency: 3);
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
