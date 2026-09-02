<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\Auctions\AuctionSettlementService;
use Illuminate\Console\Command;

final class ExpireUnpaidAuctionsCommand extends Command
{
    protected $signature = 'auctions:expire-unpaid';

    protected $description = 'Revierte subastas finalizadas cuyo ganador no pagó a tiempo (payment_deadline_at)';

    public function handle(AuctionSettlementService $settlement): int
    {
        $expired = $settlement->expireUnpaidAuctions();
        $minutes = max(1, (int) config('auctions.payment_grace_minutes', 1440));
        $this->info("Subastas no pagadas revertidas: {$expired} (margen {$minutes} min).");

        return self::SUCCESS;
    }
}
