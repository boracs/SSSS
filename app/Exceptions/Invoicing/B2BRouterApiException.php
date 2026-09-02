<?php

declare(strict_types=1);

namespace App\Exceptions\Invoicing;

use RuntimeException;
use Throwable;

/**
 * Fallo de comunicación o respuesta inesperada del API de B2BRouter.
 *
 * retryable=true  → error transitorio (timeout, 5xx, 429): el Job debe reintentar
 *                   y la factura local permanece pending (no failed).
 * retryable=false → error permanente (4xx de validación/auth): markFailed, no throw.
 */
final class B2BRouterApiException extends RuntimeException
{
    public function __construct(
        string $message = '',
        int $code = 0,
        ?Throwable $previous = null,
        public readonly bool $retryable = true,
        public readonly ?int $httpStatus = null,
    ) {
        parent::__construct($message, $code, $previous);
    }

    public function isRetryable(): bool
    {
        return $this->retryable;
    }

    public static function fromHttpStatus(string $action, int $status): self
    {
        return new self(
            message: "B2BRouter respondió con error al {$action} (HTTP {$status}).",
            retryable: self::statusIsRetryable($status),
            httpStatus: $status,
        );
    }

    public static function statusIsRetryable(int $status): bool
    {
        return $status >= 500 || $status === 408 || $status === 429;
    }
}
