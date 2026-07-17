<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Ciclo de vida de una factura fiscal emitida vía proveedor TicketBAI (B2BRouter).
 *
 * pending    → fila creada, aún no enviada a B2BRouter.
 * processing → factura creada en B2BRouter; TicketBAI en tramitación con la Hacienda Foral.
 * registered → TicketBAI aceptado; tbai_identifier + qr_payload disponibles.
 * failed     → error irrecuperable (datos fiscales, rechazo Hacienda, fallo API) — ver last_error.
 */
enum FiscalInvoiceStatus: string
{
    case Pending = 'pending';
    case Processing = 'processing';
    case Registered = 'registered';
    case Failed = 'failed';

    public function label(): string
    {
        return match ($this) {
            self::Pending    => 'Pendiente',
            self::Processing => 'En tramitación',
            self::Registered => 'Registrada',
            self::Failed     => 'Fallida',
        };
    }

    public function isTerminal(): bool
    {
        return $this === self::Registered || $this === self::Failed;
    }
}
