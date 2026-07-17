<?php

declare(strict_types=1);

namespace App\Exceptions\Invoicing;

use RuntimeException;

/**
 * El payable/usuario no tiene los datos mínimos (email, etc.) para construir una factura.
 * Error determinista: no depende de reintentos, se marca FiscalInvoiceStatus::Failed directamente.
 */
final class MissingFiscalDataException extends RuntimeException
{
}
