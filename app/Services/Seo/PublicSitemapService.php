<?php

declare(strict_types=1);

namespace App\Services\Seo;

use App\DTOs\Seo\SitemapUrlDto;
use App\Models\Article;
use App\Models\Producto;
use App\Models\SecondHandBoard;
use App\Models\Surfboard;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\Cache;

/**
 * robots.txt + sitemap.xml de páginas públicas indexables.
 * Sin datos sensibles; catálogo solo entradas públicas (segunda mano available, productos no eliminados, alquiler activos).
 */
final class PublicSitemapService
{
    private const CACHE_KEY = 'seo.sitemap.xml.v1';

    private const CACHE_TTL_SECONDS = 3600;

    /**
     * Rutas estáticas marketing / catálogo índice (path relativo).
     *
     * @var list<array{0: string, 1: string|null, 2: string|null}>
     */
    private const STATIC_PATHS = [
        ['/', 'daily', '1.0'],
        ['/nosotros', 'monthly', '0.7'],
        ['/contacto', 'monthly', '0.7'],
        ['/servicios', 'monthly', '0.6'],
        ['/servicios/reparacion-neoprenos', 'monthly', '0.5'],
        ['/servicios/surf', 'weekly', '0.9'],
        ['/servicios/surf-skate', 'weekly', '0.8'],
        ['/servicios/surf-skate/guia-equipamiento', 'monthly', '0.6'],
        ['/servicios/surf-trips', 'weekly', '0.8'],
        ['/servicios/fotos', 'monthly', '0.6'],
        ['/servicios/videograbaciones', 'monthly', '0.6'],
        ['/servicios/webcams', 'daily', '0.9'],
        ['/tienda', 'daily', '0.8'],
        ['/segunda-mano', 'daily', '0.8'],
        ['/taller', 'weekly', '0.7'],
        ['/tablas-alquiler', 'weekly', '0.8'],
        ['/tablas-alquiler/soft', 'weekly', '0.6'],
        ['/tablas-alquiler/hard_basic', 'weekly', '0.6'],
        ['/tablas-alquiler/hard_pro', 'weekly', '0.6'],
    ];

    public function robotsTxt(): string
    {
        $sitemap = $this->absoluteUrl('/sitemap.xml');

        $lines = [
            'User-agent: *',
            'Allow: /',
            '',
            'Disallow: /admin',
            'Disallow: /login',
            'Disallow: /register',
            'Disallow: /forgot-password',
            'Disallow: /reset-password',
            'Disallow: /confirm-password',
            'Disallow: /verify-email',
            'Disallow: /email',
            'Disallow: /password',
            'Disallow: /carrito',
            'Disallow: /pedidos',
            'Disallow: /pago',
            'Disallow: /pagos',
            'Disallow: /profile',
            'Disallow: /mi-perfil',
            'Disallow: /mis-reservas',
            'Disallow: /mis-facturas',
            'Disallow: /academia',
            'Disallow: /bonos',
            'Disallow: /taquilla',
            'Disallow: /taquillas',
            'Disallow: /comparador-surf',
            'Disallow: /subastas',
            'Disallow: /webhooks',
            'Disallow: /asignar-taquilla',
            'Disallow: /listaUsuarios',
            'Disallow: /gestor',
            'Disallow: /productos',
            'Disallow: /producto-crear',
            'Disallow: /producto-modificado',
            'Disallow: /producto-creado',
            '',
            'Sitemap: '.$sitemap,
            '',
        ];

        return implode("\n", $lines);
    }

    public function sitemapXml(): string
    {
        return Cache::remember(
            self::CACHE_KEY,
            self::CACHE_TTL_SECONDS,
            fn (): string => $this->buildSitemapXml(),
        );
    }

    public function forgetCache(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    private function buildSitemapXml(): string
    {
        $urls = $this->collectUrls();

        $xml = [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ];

        foreach ($urls as $url) {
            $xml[] = '  <url>';
            $xml[] = '    <loc>'.$this->escapeXml($url->loc).'</loc>';
            if ($url->lastmod !== null && $url->lastmod !== '') {
                $xml[] = '    <lastmod>'.$this->escapeXml($url->lastmod).'</lastmod>';
            }
            if ($url->changefreq !== null && $url->changefreq !== '') {
                $xml[] = '    <changefreq>'.$this->escapeXml($url->changefreq).'</changefreq>';
            }
            if ($url->priority !== null && $url->priority !== '') {
                $xml[] = '    <priority>'.$this->escapeXml($url->priority).'</priority>';
            }
            $xml[] = '  </url>';
        }

        $xml[] = '</urlset>';
        $xml[] = '';

        return implode("\n", $xml);
    }

    /**
     * @return list<SitemapUrlDto>
     */
    private function collectUrls(): array
    {
        $urls = [];

        foreach (self::STATIC_PATHS as [$path, $changefreq, $priority]) {
            $urls[] = new SitemapUrlDto(
                loc: $this->absoluteUrl($path),
                changefreq: $changefreq,
                priority: $priority,
            );
        }

        Article::query()
            ->select(['slug', 'updated_at'])
            ->orderBy('id')
            ->get()
            ->each(function (Article $article) use (&$urls): void {
                $urls[] = new SitemapUrlDto(
                    loc: $this->absoluteUrl('/taller/'.$article->slug),
                    lastmod: $this->formatLastmod($article->updated_at),
                    changefreq: 'monthly',
                    priority: '0.6',
                );
            });

        Producto::query()
            ->where('eliminado', 0)
            ->select(['id', 'updated_at'])
            ->orderBy('id')
            ->get()
            ->each(function (Producto $producto) use (&$urls): void {
                $urls[] = new SitemapUrlDto(
                    loc: $this->absoluteUrl('/producto-ver/'.$producto->id),
                    lastmod: $this->formatLastmod($producto->updated_at),
                    changefreq: 'weekly',
                    priority: '0.5',
                );
            });

        SecondHandBoard::query()
            ->available()
            ->select(['id', 'updated_at'])
            ->orderByDesc('id')
            ->get()
            ->each(function (SecondHandBoard $board) use (&$urls): void {
                $urls[] = new SitemapUrlDto(
                    loc: $this->absoluteUrl('/segunda-mano/'.$board->id),
                    lastmod: $this->formatLastmod($board->updated_at),
                    changefreq: 'weekly',
                    priority: '0.5',
                );
            });

        Surfboard::query()
            ->where('is_active', true)
            ->select(['id', 'updated_at'])
            ->orderBy('id')
            ->get()
            ->each(function (Surfboard $surfboard) use (&$urls): void {
                $urls[] = new SitemapUrlDto(
                    loc: $this->absoluteUrl('/tablas-alquiler/tabla/'.$surfboard->id),
                    lastmod: $this->formatLastmod($surfboard->updated_at),
                    changefreq: 'weekly',
                    priority: '0.5',
                );
            });

        return $urls;
    }

    private function formatLastmod(mixed $value): ?string
    {
        if ($value instanceof CarbonInterface) {
            return $value->toDateString();
        }

        return null;
    }

    private function absoluteUrl(string $path): string
    {
        $base = rtrim((string) config('app.url'), '/');
        if ($path === '' || $path === '/') {
            return $base.'/';
        }
        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }

        return $base.'/'.ltrim($path, '/');
    }

    private function escapeXml(string $value): string
    {
        return htmlspecialchars($value, ENT_XML1 | ENT_QUOTES, 'UTF-8');
    }
}
