<?php

declare(strict_types=1);

use App\Models\Article;
use App\Services\Taller\TallerArticleService;

function makeGuideArticle(string $slug, string $title): Article
{
    return Article::query()->create([
        'title' => $title,
        'slug' => $slug,
        'excerpt' => 'Excerpt de prueba',
        'content' => '<p>Contenido</p>',
        'cover_image' => '/img/taller/demo.webp',
    ]);
}

test('el raíl webcam solo incluye guías de mar en el orden canónico', function () {
    makeGuideArticle(
        'el-kit-del-surfista-guia-esencial-de-equipamiento',
        'El kit del surfista',
    );
    makeGuideArticle(
        'como-saber-en-que-direccion-rompe-una-ola',
        'Dirección de la ola',
    );
    makeGuideArticle(
        'como-interpretar-el-parte-de-olas-guia-avanzada-para-surfistas',
        'Cómo interpretar el parte',
    );
    makeGuideArticle(
        'como-hacer-el-pato-en-surf-duck-dive',
        'Cómo hacer el pato',
    );

    $cards = app(TallerArticleService::class)->webcamGuideCards();

    expect($cards)->toHaveCount(3)
        ->and($cards[0]['slug'])->toBe('como-interpretar-el-parte-de-olas-guia-avanzada-para-surfistas')
        ->and($cards[0]['chip'])->toBe('Mar')
        ->and($cards[1]['slug'])->toBe('como-hacer-el-pato-en-surf-duck-dive')
        ->and($cards[1]['chip'])->toBe('Técnica')
        ->and($cards[2]['slug'])->toBe('como-saber-en-que-direccion-rompe-una-ola')
        ->and($cards[2]['chip'])->toBe('Mar')
        ->and(collect($cards)->pluck('slug')->all())
        ->not->toContain('el-kit-del-surfista-guia-esencial-de-equipamiento');
});

test('el raíl webcam queda vacío si no hay slugs de mar', function () {
    makeGuideArticle(
        'el-kit-del-surfista-guia-esencial-de-equipamiento',
        'El kit del surfista',
    );

    expect(app(TallerArticleService::class)->webcamGuideCards())->toBe([]);
});
