<?php

declare(strict_types=1);

namespace App\DTOs\Taller;

readonly class ArticleRelatedPageDto
{
    /**
     * @param  list<ArticleCardDto>  $items
     */
    public function __construct(
        public array $items,
        public int $total,
        public int $offset,
        public int $limit,
        public bool $hasMore,
        public int $nextOffset,
    ) {}

    /**
     * @return array{
     *   items: list<array{id: int, title: string, slug: string, excerpt: string}>,
     *   total: int,
     *   offset: int,
     *   limit: int,
     *   has_more: bool,
     *   next_offset: int
     * }
     */
    public function toArray(): array
    {
        return [
            'items' => array_map(
                static fn (ArticleCardDto $item): array => $item->toArray(),
                $this->items,
            ),
            'total' => $this->total,
            'offset' => $this->offset,
            'limit' => $this->limit,
            'has_more' => $this->hasMore,
            'next_offset' => $this->nextOffset,
        ];
    }
}
