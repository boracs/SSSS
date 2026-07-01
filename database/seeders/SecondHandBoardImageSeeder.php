<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\SecondHandBoard;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;

/**
 * Asigna imágenes reales a tablas de segunda mano sin foto.
 * Reutiliza imágenes del inventario de tablas (storage/surfboards) o copia assets públicos.
 */
class SecondHandBoardImageSeeder extends Seeder
{
    public function run(): void
    {
        $pool = $this->resolveImagePool();

        if ($pool === []) {
            $this->command?->warn('SecondHandBoardImageSeeder: no hay imágenes disponibles.');

            return;
        }

        $boards = SecondHandBoard::query()->orderBy('id')->get();
        $updated = 0;

        foreach ($boards as $index => $board) {
            $current = $board->images ?? [];
            if ($current !== [] && $current !== null) {
                continue;
            }

            $primary = $pool[$index % count($pool)];
            $secondary = $pool[($index + 1) % count($pool)];

            $images = array_values(array_unique([$primary, $secondary]));

            $board->update(['images' => $images]);
            $updated++;
        }

        $this->command?->info("SecondHandBoardImageSeeder: {$updated} tablas actualizadas con imágenes.");
    }

    /**
     * @return list<string> Rutas relativas (storage/public o public/img).
     */
    private function resolveImagePool(): array
    {
        $paths = [];

        $surfboardDir = storage_path('app/public/surfboards');
        if (is_dir($surfboardDir)) {
            foreach (glob($surfboardDir . '/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}', GLOB_BRACE) ?: [] as $file) {
                $paths[] = 'surfboards/' . basename($file);
            }
        }

        $segundaManoDir = storage_path('app/public/segunda-mano');
        if (! is_dir($segundaManoDir)) {
            File::ensureDirectoryExists($segundaManoDir);
        }

        foreach (['tabla-demo.png', 'sunset_surf.webp', 'surf_skate.webp'] as $asset) {
            $source = public_path('img/' . $asset);
            if (! is_file($source)) {
                continue;
            }

            $destName = 'seed-' . $asset;
            $destPath = $segundaManoDir . DIRECTORY_SEPARATOR . $destName;

            if (! is_file($destPath)) {
                File::copy($source, $destPath);
            }

            if (Storage::disk('public')->exists('segunda-mano/' . $destName)) {
                $paths[] = 'segunda-mano/' . $destName;
            }
        }

        return array_values(array_unique($paths));
    }
}
