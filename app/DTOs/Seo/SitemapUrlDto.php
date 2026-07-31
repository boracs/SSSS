<?php

declare(strict_types=1);

namespace App\DTOs\Seo;

/**
 * Entrada de sitemap.xml (URL absoluta + lastmod opcional).
 */
readonly class SitemapUrlDto
{
    public function __construct(
        public string $loc,
        public ?string $lastmod = null,
        public ?string $changefreq = null,
        public ?string $priority = null,
    ) {}
}
