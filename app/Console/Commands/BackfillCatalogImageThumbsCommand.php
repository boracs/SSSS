<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Auction;
use App\Models\Imagen;
use App\Models\SecondHandBoard;
use App\Models\Surfboard;
use App\Services\Media\CatalogImageService;
use Illuminate\Console\Command;

final class BackfillCatalogImageThumbsCommand extends Command
{
    protected $signature = 'images:backfill-catalog-thumbs';

    protected $description = 'Genera máster WebP + thumb para fotos de catálogo ya subidas (idempotente)';

    public function handle(CatalogImageService $images): int
    {
        if (! $images->gdReady()) {
            $this->error('GD+WebP no está disponible en este PHP. Instala php-gd con WebP y reintenta.');

            return self::FAILURE;
        }

        $updated = 0;
        $skipped = 0;

        $this->info('Productos…');
        foreach (Imagen::query()->cursor() as $imagen) {
            $next = $images->backfillStoredPath((string) $imagen->ruta);
            if ($next === null) {
                $skipped++;
                continue;
            }
            if ($next !== $imagen->ruta) {
                $imagen->ruta = $next;
                $imagen->save();
                $updated++;
            } else {
                $skipped++;
            }
        }

        $this->info('Segunda mano…');
        foreach (SecondHandBoard::query()->withTrashed()->cursor() as $board) {
            $paths = $board->images ?? [];
            if (! is_array($paths) || $paths === []) {
                $skipped++;
                continue;
            }
            $rewritten = [];
            $changed = false;
            foreach ($paths as $path) {
                if (! is_string($path) || $path === '') {
                    continue;
                }
                $next = $images->backfillStoredPath($path) ?? $path;
                $rewritten[] = $next;
                $changed = $changed || $next !== $path;
            }
            if ($changed) {
                $board->images = $rewritten;
                $board->save();
                $updated++;
            } else {
                $skipped++;
            }
        }

        $this->info('Subastas…');
        foreach (Auction::query()->cursor() as $auction) {
            $paths = $auction->images ?? [];
            if (! is_array($paths) || $paths === []) {
                $skipped++;
                continue;
            }
            $rewritten = [];
            $changed = false;
            foreach ($paths as $path) {
                if (! is_string($path) || $path === '') {
                    continue;
                }
                $next = $images->backfillStoredPath($path) ?? $path;
                $rewritten[] = $next;
                $changed = $changed || $next !== $path;
            }
            if ($changed) {
                $auction->images = $rewritten;
                $auction->save();
                $updated++;
            } else {
                $skipped++;
            }
        }

        $this->info('Tablas de alquiler (admin)…');
        foreach (Surfboard::query()->cursor() as $surfboard) {
            $raw = $surfboard->image_url;
            $paths = is_string($raw) ? json_decode($raw, true) : $raw;
            if (! is_array($paths)) {
                $paths = is_string($raw) && $raw !== '' ? [$raw] : [];
            }
            if ($paths === []) {
                $skipped++;
                continue;
            }
            $rewritten = [];
            $changed = false;
            foreach ($paths as $path) {
                if (! is_string($path) || $path === '') {
                    continue;
                }
                $next = $images->backfillStoredPath($path) ?? $path;
                $rewritten[] = $next;
                $changed = $changed || $next !== $path;
            }
            if ($changed) {
                $surfboard->image_url = json_encode($rewritten);
                $surfboard->save();
                $updated++;
            } else {
                $skipped++;
            }
        }

        $this->info("Listo. Filas actualizadas: {$updated}. Sin cambio de path: {$skipped}.");

        return self::SUCCESS;
    }
}
