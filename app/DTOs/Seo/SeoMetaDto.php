<?php

declare(strict_types=1);

namespace App\DTOs\Seo;

/**
 * Metadatos SEO/GEO listos para Inertia → SeoHead.
 * Sin lógica: solo datos sanitizados desde PublicPageSeoService.
 *
 * @phpstan-type JsonLdNode array<string, mixed>
 * @phpstan-type PreloadImage array{href: string, as?: string, type?: string, imagesrcset?: string, imagesizes?: string, fetchpriority?: string}
 */
readonly class SeoMetaDto
{
    /**
     * @param  list<JsonLdNode>  $jsonLd
     * @param  list<PreloadImage>  $preloadImages
     */
    public function __construct(
        public string $title,
        public string $description,
        public string $canonical,
        public string $ogTitle,
        public string $ogDescription,
        public string $ogImage,
        public string $ogType,
        public string $ogLocale,
        public string $robots,
        public array $jsonLd,
        public array $preloadImages = [],
    ) {}

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'title' => $this->title,
            'description' => $this->description,
            'canonical' => $this->canonical,
            'ogTitle' => $this->ogTitle,
            'ogDescription' => $this->ogDescription,
            'ogImage' => $this->ogImage,
            'ogType' => $this->ogType,
            'ogLocale' => $this->ogLocale,
            'robots' => $this->robots,
            'jsonLd' => $this->jsonLd,
            'preloadImages' => $this->preloadImages,
        ];
    }
}
