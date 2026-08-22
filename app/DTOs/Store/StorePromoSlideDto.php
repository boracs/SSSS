<?php

declare(strict_types=1);

namespace App\DTOs\Store;

readonly class StorePromoSlideDto
{
    public function __construct(
        public string $key,
        public string $eyebrow,
        public string $title,
        public string $subtitle,
        public string $ctaLabel,
        public string $href,
        public string $imageUrl,
        public ?string $priceLabel = null,
        public ?string $thumbUrl = null,
    ) {}

    /**
     * @return array{
     *   key: string,
     *   eyebrow: string,
     *   title: string,
     *   subtitle: string,
     *   ctaLabel: string,
     *   href: string,
     *   imageUrl: string,
     *   priceLabel: string|null,
     *   thumbUrl: string|null
     * }
     */
    public function toArray(): array
    {
        return [
            'key' => $this->key,
            'eyebrow' => $this->eyebrow,
            'title' => $this->title,
            'subtitle' => $this->subtitle,
            'ctaLabel' => $this->ctaLabel,
            'href' => $this->href,
            'imageUrl' => $this->imageUrl,
            'priceLabel' => $this->priceLabel,
            'thumbUrl' => $this->thumbUrl,
        ];
    }
}
