<?php

use App\Services\AttendanceNoteRelinker;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote')->hourly();

Schedule::command('academy:audit-lesson-credits')->everyFiveMinutes();

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
