<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\Taquilla\TaquillaMembershipService;
use Illuminate\Console\Command;

final class SyncLockerExpiryCacheCommand extends Command
{
    protected $signature = 'taquilla:sync-expiry-cache';

    protected $description = 'Recalcula users.fecha_vencimiento_cuota desde MAX(periodo_fin) de pagos confirmados';

    public function handle(TaquillaMembershipService $taquilla): int
    {
        $updated = $taquilla->syncAllLockerExpiryCaches();
        $this->info('Caché de vigencia de taquilla actualizada: '.$updated);

        return self::SUCCESS;
    }
}
