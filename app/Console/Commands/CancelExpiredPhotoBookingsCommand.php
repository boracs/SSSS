<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\Photos\PhotoBookingService;
use Illuminate\Console\Command;

final class CancelExpiredPhotoBookingsCommand extends Command
{
    protected $signature = 'photos:cancel-expired';

    protected $description = 'Cancela reservas de fotos pendientes cuyo checkout Stripe ha caducado';

    public function handle(PhotoBookingService $photos): int
    {
        $cancelled = $photos->cancelExpiredPending();
        $this->info('Reservas de fotos caducadas canceladas: '.$cancelled->count());

        return self::SUCCESS;
    }
}
