<?php

declare(strict_types=1);

use App\Models\Article;
use App\Models\Producto;
use App\Models\User;
use App\Services\Seo\PublicSitemapService;
use App\Services\Vip\VipMembershipService;
use Illuminate\Support\Facades\Cache;

test('robots.txt permite el rastreo y bloquea áreas privadas', function () {
    $body = $this->get(route('seo.robots'))
        ->assertOk()
        ->assertHeader('Content-Type', 'text/plain; charset=UTF-8')
        ->getContent();

    expect($body)->toContain('User-agent: *')
        ->and($body)->toContain('Disallow: /admin')
        ->and($body)->toContain('Disallow: /carrito')
        ->and($body)->toContain('Disallow: /subastas')
        ->and($body)->not->toContain('Disallow: /comparador-surf')
        ->and($body)->toContain('Sitemap:');
});

test('sitemap.xml lista páginas públicas e ignora admin, carrito, subastas y comparador', function () {
    $xml = $this->get('/sitemap.xml')
        ->assertOk()
        ->assertHeader('Content-Type', 'application/xml; charset=UTF-8')
        ->getContent();

    expect($xml)->toContain('/nosotros')
        ->and($xml)->toContain('/tienda')
        ->and($xml)->toContain('/taller')
        ->and($xml)->not->toContain('/admin')
        ->and($xml)->not->toContain('/carrito')
        ->and($xml)->not->toContain('/subastas')
        ->and($xml)->not->toContain('/comparador-surf');
});

test('crear un artículo invalida la caché y entra en el sitemap sin esperar el TTL', function () {
    $this->get('/sitemap.xml')->assertOk();
    expect(Cache::has('seo.sitemap.xml.v2'))->toBeTrue();

    $article = Article::query()->create([
        'title' => 'Guía L5b sitemap',
        'slug' => 'guia-l5b-sitemap',
        'excerpt' => 'Excerpt test sitemap',
        'content' => '<p>Contenido</p>',
    ]);

    $xml = $this->get('/sitemap.xml')->assertOk()->getContent();

    expect($xml)->toContain('/taller/'.$article->slug);
});

test('crear un producto público también aparece en el sitemap al invalidar caché', function () {
    app(PublicSitemapService::class)->sitemapXml();

    $producto = Producto::factory()->create([
        'eliminado' => 0,
        'nombre' => 'Wax L5b sitemap',
    ]);

    $xml = $this->get('/sitemap.xml')->assertOk()->getContent();

    expect($xml)->toContain('/producto-ver/'.$producto->id);
});

test('el comparador responde 200 con meta noindex y robots ya no lo Disallow', function () {
    $this->get(route('autocoach.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('AutoCoach/Index')
            ->where('seo.robots', 'noindex, nofollow'));

    expect($this->get(route('seo.robots'))->getContent())
        ->not->toContain('Disallow: /comparador-surf');
});

test('carrito y subastas llevan noindex', function () {
    $user = User::factory()->create(['role' => 'user', 'is_vip' => false, 'numeroTaquilla' => null]);
    $vip = app(VipMembershipService::class)->activate($user);

    $this->actingAs($vip)
        ->get(route('carrito'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('seo.robots', 'noindex, nofollow'));

    $this->actingAs($vip)
        ->get(route('auctions.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('seo.robots', 'noindex, nofollow'));
});

test('admin exige login y robots.txt lo excluye', function () {
    $this->get(route('admin.class-manager.index'))->assertRedirect();

    expect($this->get(route('seo.robots'))->getContent())->toContain('Disallow: /admin');
});
