<?php

declare(strict_types=1);

namespace App\Exceptions;

use RuntimeException;

final class TransactionRequiredException extends RuntimeException
{
    public static function forMethod(string $class, string $method): self
    {
        return new self("{$class}::{$method} requiere una transacción DB activa (DB::transaction).");
    }
}
