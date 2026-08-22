<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\Store\StoreOrderStockService;
use Illuminate\Console\Command;

final class ReleaseUnpaidStoreOrdersCommand extends Command
{
    protected $signature = 'store:release-unpaid';

    protected $description = 'Devuelve stock de checkouts Stripe de tienda abandonados (card, no pagados, no entregados)';

    public function handle(StoreOrderStockService $stock): int
    {
        $released = $stock->releaseExpiredUnpaid();
        $minutes = max(15, (int) config('store.unpaid_hold_minutes', 1440));
        $this->info("Pedidos de tienda no pagados liberados: {$released} (margen {$minutes} min).");

        return self::SUCCESS;
    }
}
