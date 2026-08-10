<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\Taquilla\TaquillaMembershipService;
use Illuminate\Console\Command;

final class PurgeExpiredTaquillaPaymentsCommand extends Command
{
    protected $signature = 'taquilla:purge-expired-pending';

    protected $description = 'Borra cuotas de taquilla pendientes cuyo checkout Stripe se abandonó';

    public function handle(TaquillaMembershipService $taquilla): int
    {
        $deleted = $taquilla->purgeExpiredPendingPayments();
        $this->info('Cuotas de taquilla pendientes caducadas borradas: '.$deleted);

        return self::SUCCESS;
    }
}
