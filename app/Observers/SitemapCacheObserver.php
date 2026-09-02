<?php

declare(strict_types=1);

namespace App\Observers;

use App\Services\Seo\PublicSitemapService;

/**
 * El sitemap se cachea 1 h. Sin esto, un artículo/producto nuevo no entra hasta el TTL.
 */
final class SitemapCacheObserver
{
    public function __construct(
        private readonly PublicSitemapService $sitemap,
    ) {}

    public function saved(mixed $model): void
    {
        $this->sitemap->forgetCache();
    }

    public function deleted(mixed $model): void
    {
        $this->sitemap->forgetCache();
    }

    public function restored(mixed $model): void
    {
        $this->sitemap->forgetCache();
    }
}
