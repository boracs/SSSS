<?php

declare(strict_types=1);

namespace App\Services\Taquilla;

use App\Mail\Taquilla\PagoTaquillaConfirmadoMail;
use App\Models\PagoCuota;
use App\Models\User;
use Illuminate\Support\Facades\Mail;

/**
 * Envío de correos transversales para el ciclo de vida de las cuotas de taquilla.
 */
final class TaquillaConfirmationMailService
{
    public function sendPagoConfirmado(PagoCuota $pago, User $usuario, ?int $lockerNumber = null): void
    {
        if (empty($usuario->email)) {
            return;
        }

        $pago->loadMissing('plan');

        Mail::to($usuario->email)->send(new PagoTaquillaConfirmadoMail(
            pago: $pago,
            usuario: $usuario,
            lockerNumber: $lockerNumber ?? $usuario->numeroTaquilla,
        ));
    }
}
