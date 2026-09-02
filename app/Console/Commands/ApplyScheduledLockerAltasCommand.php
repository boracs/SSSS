<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\Taquilla\TaquillaMembershipService;
use Illuminate\Console\Command;

final class ApplyScheduledLockerAltasCommand extends Command
{
    protected $signature = 'taquilla:apply-scheduled-altas';

    protected $description = 'Sella taquilla_alta_at el día programado (alta diferida de ex-socios)';

    public function handle(TaquillaMembershipService $taquilla): int
    {
        $applied = $taquilla->applyDueScheduledAltas();
        $this->info('Altas de taquilla aplicadas: '.$applied);

        return self::SUCCESS;
    }
}
