<?php

declare(strict_types=1);

namespace App\Listeners\Taquilla;

use App\Events\Taquilla\PagoTaquillaConfirmado;
use App\Services\Taquilla\TaquillaConfirmationMailService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Log;
use Throwable;

class EnviarCorreoConfirmacionTaquilla implements ShouldQueue
{
    public function __construct(
        private readonly TaquillaConfirmationMailService $mailService,
    ) {}

    public function handle(PagoTaquillaConfirmado $event): void
    {
        try {
            $this->mailService->sendPagoConfirmado(
                pago: $event->pago,
                usuario: $event->usuario,
                lockerNumber: $event->lockerNumber,
            );
        } catch (Throwable $e) {
            Log::error('taquilla.pago_confirmado.mail_failed', [
                'action' => 'enviar_correo_confirmacion_taquilla',
                'pago_id' => $event->pago->id,
                'pago_referencia' => $event->pago->referencia_pago_externa,
                'user_id' => $event->usuario->id,
                'locker_number' => $event->lockerNumber,
                'error' => $e->getMessage(),
                'exception' => $e::class,
                'trace' => $e->getTraceAsString(),
            ]);
        }
    }
}
