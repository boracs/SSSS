<?php

declare(strict_types=1);

namespace App\DTOs\EmergencyKey;

final readonly class EmergencyKeyRevealDto
{
    public function __construct(
        public string $code,
        public string $requestedAt,
    ) {}

    /**
     * @return array<string, string>
     */
    public function toArray(): array
    {
        return [
            'code'          => $this->code,
            'requested_at'  => $this->requestedAt,
        ];
    }
}
