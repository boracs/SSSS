<?php

declare(strict_types=1);

namespace App\Enums\Invoicing;

use App\Models\Booking;
use App\Models\LessonUser;
use App\Models\PagoCuota;
use App\Models\Pedido;
use App\Models\UserBono;

/**
 * Categorías de facturación fiscal mostradas al cliente en "Mis facturas".
 *
 * `isEnabled()` exige DOS condiciones reales, nunca hardcodeadas:
 * 1. `config('invoicing.enabled')` — kill-switch global (hoy false: entorno de
 *    prueba, ninguna factura real se envía a B2BRouter/Hacienda Foral).
 * 2. `config('invoicing.payable_types.<FQCN>')` — whitelist por dominio.
 *
 * Los 5 dominios (Pedido, UserBono, Booking, LessonUser, PagoCuota) ya tienen
 * su rama implementada en {@see \App\Services\Invoicing\FiscalInvoiceBuilderService}.
 * El único gate que falta para pasar a producción real es activar
 * `INVOICING_ENABLED=true` tras confirmar precios/políticas con el cliente.
 */
enum FiscalInvoiceCategory: string
{
    case Tienda = 'tienda';
    case BonosClases = 'bonos_clases';
    case BonosTaquilla = 'bonos_taquilla';
    case Alquileres = 'alquileres';
    case Clases = 'clases';

    public function label(): string
    {
        return match ($this) {
            self::Tienda => 'Tienda',
            self::BonosClases => 'Bonos de clases',
            self::BonosTaquilla => 'Taquillas',
            self::Alquileres => 'Alquiler de tablas',
            self::Clases => 'Clases sueltas',
        };
    }

    /** @return class-string */
    public function payableType(): string
    {
        return match ($this) {
            self::Tienda => Pedido::class,
            self::BonosClases => UserBono::class,
            self::BonosTaquilla => PagoCuota::class,
            self::Alquileres => Booking::class,
            self::Clases => LessonUser::class,
        };
    }

    /**
     * true solo si el kill-switch global Y el whitelist del payable están ambos activos.
     * Con `INVOICING_ENABLED=false` (entorno de prueba actual) esto es siempre false,
     * aunque el payable_type ya esté en la whitelist y el builder ya lo soporte.
     */
    public function isEnabled(): bool
    {
        return (bool) config('invoicing.enabled', false)
            && (bool) config('invoicing.payable_types.'.$this->payableType(), false);
    }

    public static function fromPayableType(string $payableType): ?self
    {
        foreach (self::cases() as $case) {
            if ($case->payableType() === $payableType) {
                return $case;
            }
        }

        return null;
    }
}
