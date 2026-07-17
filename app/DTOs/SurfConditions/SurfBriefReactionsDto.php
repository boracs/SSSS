<?php

declare(strict_types=1);

namespace App\DTOs\SurfConditions;

final readonly class SurfBriefReactionsDto
{
    public function __construct(
        public int $likes,
        public int $dislikes,
        public ?string $mine,
    ) {}

    /** @return array{likes: int, dislikes: int, mine: string|null} */
    public function toArray(): array
    {
        return [
            'likes' => $this->likes,
            'dislikes' => $this->dislikes,
            'mine' => $this->mine,
        ];
    }
}
