<?php

namespace App\Console\Commands;

use App\Services\AutoCoach\AutoCoachCleanupService;
use Illuminate\Console\Command;

class CleanupAutoCoachUploads extends Command
{
    protected $signature = 'autocoach:cleanup-uploads';

    protected $description = 'Elimina carpetas de vídeos subidos por visitantes tras el TTL configurado';

    public function handle(AutoCoachCleanupService $cleanup): int
    {
        $deleted = $cleanup->cleanupExpiredUploads();
        $this->info("AutoCoach: {$deleted} sesión(es) de subida eliminada(s).");

        return self::SUCCESS;
    }
}
