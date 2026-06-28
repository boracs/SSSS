<?php

declare(strict_types=1);

namespace App\Listeners\Taquilla;

use App\Events\Taquilla\PagoTaquillaRechazado;
use App\Services\Taquilla\TaquillaConfirmationMailService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Log;
use Throwable;

class EnviarCorreoRechazoTaquilla implements ShouldQueue
{
    public function __construct(
        private readonly TaquillaConfirmationMailService $mailService,
    ) {}

    public function handle(PagoTaquillaRechazado $event): void
    {
        try {
            $this->mailService->sendPagoRechazado(
                pago: $event->pago,
                usuario: $event->usuario,
                motivo: $event->motivo,
            );
        } catch (Throwable $e) {
            Log::error('taquilla.pago_rechazado.mail_failed', [
                'action' => 'enviar_correo_rechazo_taquilla',
                'pago_id' => $event->pago->id,
                'pago_referencia' => $event->pago->referencia_pago_externa,
                'user_id' => $event->usuario->id,
                'motivo' => $event->motivo,
                'error' => $e->getMessage(),
                'exception' => $e::class,
                'trace' => $e->getTraceAsString(),
            ]);
        }
    }
}
