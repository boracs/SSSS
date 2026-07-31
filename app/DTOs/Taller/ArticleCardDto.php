<?php

declare(strict_types=1);

namespace App\DTOs\Taller;

use App\Models\Article;

readonly class ArticleCardDto
{
    public function __construct(
        public int $id,
        public string $title,
        public string $slug,
        public string $excerpt,
    ) {}

    public static function fromModel(Article $article): self
    {
        return new self(
            id: (int) $article->id,
            title: (string) $article->title,
            slug: (string) $article->slug,
            excerpt: (string) ($article->excerpt ?? ''),
        );
    }

    /**
     * @return array{id: int, title: string, slug: string, excerpt: string}
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'slug' => $this->slug,
            'excerpt' => $this->excerpt,
        ];
    }
}
