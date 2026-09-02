<?php

declare(strict_types=1);

namespace App\DTOs\Taller;

use App\Models\Article;

readonly class TallerGuideRailItemDto
{
    public function __construct(
        public int $id,
        public string $title,
        public string $slug,
        public string $excerpt,
        public ?string $coverImage,
        public string $chip,
    ) {}

    public static function fromModel(Article $article, string $chip): self
    {
        $cover = $article->cover_image;

        return new self(
            id: (int) $article->id,
            title: (string) $article->title,
            slug: (string) $article->slug,
            excerpt: (string) ($article->excerpt ?? ''),
            coverImage: is_string($cover) && $cover !== '' ? $cover : null,
            chip: $chip,
        );
    }

    /**
     * @return array{id: int, title: string, slug: string, excerpt: string, cover_image: string|null, chip: string}
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'slug' => $this->slug,
            'excerpt' => $this->excerpt,
            'cover_image' => $this->coverImage,
            'chip' => $this->chip,
        ];
    }
}
