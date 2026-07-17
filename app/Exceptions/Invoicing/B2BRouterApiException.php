<?php

declare(strict_types=1);

namespace App\Exceptions\Invoicing;

use RuntimeException;

/**
 * Fallo de comunicación o respuesta inesperada del API de B2BRouter.
 * Error transitorio: el Job debe poder reintentar (backoff) tras recibirla.
 */
final class B2BRouterApiException extends RuntimeException
{
}
