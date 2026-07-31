<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Services\Seo\PublicSitemapService;
use Illuminate\Http\Response;

/**
 * robots.txt y sitemap.xml públicos (sin Inertia).
 */
final class SitemapController extends Controller
{
    public function robots(PublicSitemapService $sitemap): Response
    {
        return response($sitemap->robotsTxt(), 200, [
            'Content-Type' => 'text/plain; charset=UTF-8',
            'Cache-Control' => 'public, max-age=3600',
        ]);
    }

    public function sitemap(PublicSitemapService $sitemap): Response
    {
        return response($sitemap->sitemapXml(), 200, [
            'Content-Type' => 'application/xml; charset=UTF-8',
            'Cache-Control' => 'public, max-age=3600',
        ]);
    }
}
