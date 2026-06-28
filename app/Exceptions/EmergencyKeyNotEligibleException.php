<?php

declare(strict_types=1);

namespace App\Exceptions;

use RuntimeException;

class EmergencyKeyNotEligibleException extends RuntimeException
{
    public static function notSocio(): self
    {
        return new self('Debes ser socio con taquilla activa y cuota vigente para solicitar la llave de emergencia.');
    }

    public static function lockInactive(): self
    {
        return new self('La llave de emergencia ya ha sido retirada en este ciclo.');
    }
}
