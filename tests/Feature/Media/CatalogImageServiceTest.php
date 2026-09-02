<?php

declare(strict_types=1);

use App\Services\Media\CatalogImageService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('public');
});

test('al subir un jpeg grande se guarda máster webp, thumb y se borra el original', function () {
    $service = app(CatalogImageService::class);
    expect($service->gdReady())->toBeTrue();

    $file = UploadedFile::fake()->image('tabla.jpg', 2000, 1200);
    $stored = $service->storeFromUpload($file, 'productos');

    expect($stored->passthrough)->toBeFalse()
        ->and($stored->masterPath)->toEndWith('.webp')
        ->and($stored->thumbPath)->toEndWith('-thumb.webp');

    Storage::disk('public')->assertExists($stored->masterPath);
    Storage::disk('public')->assertExists($stored->thumbPath);

    $jpgs = collect(Storage::disk('public')->allFiles('productos'))
        ->filter(fn (string $path) => str_ends_with(strtolower($path), '.jpg'));
    expect($jpgs)->toBeEmpty();

    $masterAbs = Storage::disk('public')->path($stored->masterPath);
    $thumbAbs = Storage::disk('public')->path((string) $stored->thumbPath);
    $masterSize = getimagesize($masterAbs);
    $thumbSize = getimagesize($thumbAbs);

    expect($masterSize[0])->toBeLessThanOrEqual(CatalogImageService::MASTER_MAX_EDGE)
        ->and($thumbSize[0])->toBeLessThanOrEqual(CatalogImageService::THUMB_MAX_EDGE);

    $listing = $service->publicThumbUrl($stored->masterPath);
    $masterUrl = $service->publicMasterUrl($stored->masterPath);
    expect($listing)->toContain('-thumb.webp')
        ->and($masterUrl)->not->toContain('-thumb.webp');
});

test('svg se guarda tal cual sin variantes', function () {
    $service = app(CatalogImageService::class);
    $file = UploadedFile::fake()->create('logo.svg', 12, 'image/svg+xml');
    $stored = $service->storeFromUpload($file, 'productos');

    expect($stored->passthrough)->toBeTrue()
        ->and($stored->thumbPath)->toBeNull();
    Storage::disk('public')->assertExists($stored->masterPath);
});

test('deletePair borra máster y thumb', function () {
    $service = app(CatalogImageService::class);
    $stored = $service->storeFromUpload(
        UploadedFile::fake()->image('board.jpg', 800, 600),
        'segunda-mano',
    );

    $service->deletePair($stored->masterPath);

    Storage::disk('public')->assertMissing($stored->masterPath);
    if ($stored->thumbPath !== null) {
        Storage::disk('public')->assertMissing($stored->thumbPath);
    }
});

test('publicMasterUrl usa el webp si el RAW de BD ya no está en disco', function () {
    $service = app(CatalogImageService::class);
    Storage::disk('public')->put('productos/neopreno-traje-frontal.webp', 'webp-bytes');

    $url = $service->publicMasterUrl('productos/neopreno-traje-frontal.png');

    expect($url)->toContain('neopreno-traje-frontal.webp')
        ->and($url)->not->toContain('.png');
});

test('backfill es idempotente si ya hay thumb webp', function () {
    $service = app(CatalogImageService::class);
    $stored = $service->storeFromUpload(
        UploadedFile::fake()->image('once.jpg', 900, 600),
        'subastas',
    );

    $again = $service->backfillStoredPath($stored->masterPath);

    expect($again)->toBe($stored->masterPath);
    Storage::disk('public')->assertExists($stored->masterPath);
    Storage::disk('public')->assertExists((string) $stored->thumbPath);
});

test('backfill reescribe a webp si el RAW desapareció y el máster sigue', function () {
    $service = app(CatalogImageService::class);
    Storage::disk('public')->put('productos/neopreno-traje-frontal.webp', 'webp-bytes');

    expect($service->backfillStoredPath('productos/neopreno-traje-frontal.png'))
        ->toBe('productos/neopreno-traje-frontal.webp');
});
