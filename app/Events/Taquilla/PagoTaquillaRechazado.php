<?php

declare(strict_types=1);

namespace App\Events\Taquilla;

use App\Models\PagoCuota;
use App\Models\User;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Se emite cuando un administrador rechaza un pago de taquilla.
 * Permite desacoplar efectos secundarios (correo, notificaciones) del flujo HTTP.
 */
class PagoTaquillaRechazado
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public readonly PagoCuota $pago,
        public readonly User $usuario,
        public readonly string $motivo,
    ) {}
}
