<?php

declare(strict_types=1);

namespace App\Exceptions\Invoicing;

use RuntimeException;

/**
 * El payable_type no está habilitado en config('invoicing.payable_types').
 */
final class UnsupportedFiscalPayableException extends RuntimeException
{
}
