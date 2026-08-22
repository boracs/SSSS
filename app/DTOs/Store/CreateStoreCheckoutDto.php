<?php

declare(strict_types=1);

namespace App\DTOs\Store;

final readonly class CreateStoreCheckoutDto
{
    /**
     * @param  list<array{id?: mixed, cantidad?: mixed}>  $cartLines
     */
    public function __construct(
        public int $userId,
        public array $cartLines,
        public float|int|string $quotedTotalEuros,
        public ?string $fechaEntregaYmd = null,
    ) {}
}
