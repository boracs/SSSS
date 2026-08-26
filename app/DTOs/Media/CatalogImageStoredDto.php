<?php

declare(strict_types=1);

namespace App\DTOs\Media;

final readonly class CatalogImageStoredDto
{
    public function __construct(
        public string $masterPath,
        public ?string $thumbPath,
        public bool $passthrough,
    ) {}
}
