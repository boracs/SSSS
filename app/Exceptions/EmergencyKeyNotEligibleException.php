<?php

declare(strict_types=1);

namespace App\Exceptions;

use RuntimeException;

class EmergencyKeyNotEligibleException extends RuntimeException
{
    public static function notPhysicalLocker(): self
    {
        return new self('La llave de emergencia es solo para socios con taquilla física en el club. El VIP compartido no tiene candado de casillero.');
    }

    public static function dailyLimit(): self
    {
        return new self('Ya has solicitado la llave de emergencia hoy. Vuelve a intentarlo mañana o avisa en recepción si sigue habiendo un problema.');
    }

    public static function notSocio(): self
    {
        return new self('Debes ser socio con taquilla activa y cuota vigente para solicitar la llave de emergencia.');
    }

    public static function lockInactive(): self
    {
        return new self('La llave de emergencia ya ha sido retirada en este ciclo.');
    }
}
