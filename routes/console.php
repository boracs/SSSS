<?php

use App\Services\AttendanceNoteRelinker;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Schedule::command('academy:audit-lesson-credits')->everyFiveMinutes();
// Alquiler: devuelve al inventario las tablas no recogidas (margen en config/rentals.php).
Schedule::command('rentals:release-no-shows')->everyFiveMinutes();
Schedule::command('autocoach:cleanup-uploads')->everyFiveMinutes();
// Fotos: cancela checkouts Stripe abandonados (expires_at).
Schedule::command('photos:cancel-expired')->everyFiveMinutes();
// Taquilla: borra cuotas pendientes cuyo checkout Stripe se abandonó.
Schedule::command('taquilla:purge-expired-pending')->everyFiveMinutes();
// Alquiler: cancela reservas pendientes si no se pagó el depósito online a tiempo.
Schedule::command('rentals:expire-pending-unpaid')->everyFiveMinutes();
// Parte Zurriola: cada 6 h. Requiere crontab `* * * * * php artisan schedule:run` en servidor.
Schedule::command('surf:generate-daily-brief', ['--force' => true])->everySixHours();

Artisan::command('attendance-notes:relink-orphans {--user= : ID de usuario (opcional)}', function () {
    $uid = $this->option('user');
    $only = $uid !== null && $uid !== '' ? (int) $uid : null;
    if ($only !== null && $only < 1) {
        $this->error('ID de usuario no válido.');

        return 1;
    }
    $n = AttendanceNoteRelinker::relinkOrphanLessonUserNotes($only);
    $this->info("Notas actualizadas: {$n}");

    return 0;
})->purpose('Re-asocia notas lesson_user huérfanas por fecha de clase / consumo');
