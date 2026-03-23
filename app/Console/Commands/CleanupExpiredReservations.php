<?php

namespace App\Console\Commands;

use App\Services\AutoReleaseService;
use Illuminate\Console\Command;

class CleanupExpiredReservations extends Command
{
    protected $signature = 'academy:cleanup';

    protected $description = 'Libera plazas de reservas pendientes que superaron el tiempo limite sin comprobante';

    public function handle(AutoReleaseService $autoReleaseService): int
    {
        $result = $autoReleaseService->cleanupExpiredReservations();

        $this->info('Auto-cleanup completado. Reservas liberadas: '.($result['total_released'] ?? 0));

        return self::SUCCESS;
    }
}

