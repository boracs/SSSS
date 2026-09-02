<?php

declare(strict_types=1);

use App\Http\Controllers\Academy\LessonController;
use App\Http\Controllers\Admin\AcademyController;
use Illuminate\Console\Scheduling\Schedule;

/**
 * Estos barridos liberan recursos (plazas de clase, cobros a medias). Si salen del
 * scheduler el sistema no da error: deja de limpiar, y el fallo solo se nota cuando ya
 * hay cupo bloqueado o dinero cobrado en Stripe sin confirmar en la app.
 */
function scheduledCommands(): array
{
    return collect(app(Schedule::class)->events())
        ->map(fn ($event) => (string) $event->command)
        ->all();
}

test('los barridos críticos están programados', function (string $command) {
    $scheduled = collect(scheduledCommands())
        ->contains(fn (string $scheduled) => str_contains($scheduled, $command));

    expect($scheduled)->toBeTrue("El comando `{$command}` no está en routes/console.php");
})->with([
    'academy:cleanup',
    'payments:sync-stripe-session',
    'auctions:expire-unpaid',
    'taquilla:sync-expiry-cache',
    'taquilla:apply-scheduled-altas',
]);

test('LessonController ya no barre reservas caducadas al construirse', function () {
    $reflection = new ReflectionClass(LessonController::class);
    $constructor = $reflection->getConstructor();

    $source = file($reflection->getFileName());
    $body = implode('', array_slice(
        $source,
        $constructor->getStartLine() - 1,
        $constructor->getEndLine() - $constructor->getStartLine() + 1,
    ));

    expect($body)->not->toContain('cleanupExpiredReservations');
});

test('AcademyController (Commander) ya no barre reservas caducadas al construirse', function () {
    $reflection = new ReflectionClass(AcademyController::class);
    $constructor = $reflection->getConstructor();

    $source = file($reflection->getFileName());
    $body = implode('', array_slice(
        $source,
        $constructor->getStartLine() - 1,
        $constructor->getEndLine() - $constructor->getStartLine() + 1,
    ));

    expect($body)->not->toContain('cleanupExpiredReservations')
        ->and($body)->not->toContain('auto_cleanup_check')
        ->and(file_get_contents($reflection->getFileName()))->not->toContain('auto_cleanup_check');
});
