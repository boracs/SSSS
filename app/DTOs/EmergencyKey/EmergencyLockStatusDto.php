<?php

declare(strict_types=1);

namespace App\DTOs\EmergencyKey;

final readonly class EmergencyLockStatusDto
{
    public function __construct(
        public bool $isActive,
        public bool $canRequest,
    ) {}

    /**
     * @return array<string, bool>
     */
    public function toArray(): array
    {
        return [
            'is_active'   => $this->isActive,
            'can_request' => $this->canRequest,
        ];
    }
}
