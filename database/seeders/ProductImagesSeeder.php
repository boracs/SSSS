<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Imagen;
use App\Models\Producto;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;

/**
 * Asigna fotos reales de storage/app/public/productos a cada producto de tienda.
 */
final class ProductImagesSeeder extends Seeder
{
    /** @var list<string> Rutas preferentes por tipo (se repiten si hace falta). */
    private const PREFERRED = [
        'fcs-fins.png',
        '2h5008zKTnSfKYrh30ank84w6UPrtIBP9j2nyTMl.webp',
        '31WjHhy5UZ6UV4JVqZhQYE1uSVrs6bxq53Q6JKME.webp',
        '3Abjw06KWkN2qFkLkRT06z0zmPXwOGBYUVV658yn.webp',
        '5qHNw8RAQLpkslBjgGaYSGq6rJhtQCkwDPq1aXOY.jpg',
        '62znkZK1WRNEaELQXtxFonV7CiHvc2Xb5FQKtLCr.jpg',
        '9KMoHwWbVJJ9iZyFV51gBGFsMCpoMeupvz8uM0bS.webp',
        'D2HrC5Ldh2HkJLOJYZxXUVlCuHBfAnMr9eejvZhu.webp',
        'EnFHErNNzc8bBw1r7YoDRKsjpfDXTRZsqcvRkwU2.webp',
        'eKhZpgYrWpduDnolhWy1gR640mUp8Mi3uXqODoSm.webp',
    ];

    public function run(): void
    {
        $paths = $this->resolveImagePaths();
        if ($paths === []) {
            $this->command?->warn('ProductImagesSeeder: no hay archivos en storage/app/public/productos');

            return;
        }

        $products = Producto::query()
            ->where('eliminado', false)
            ->orderBy('id')
            ->get();

        if ($products->isEmpty()) {
            $this->command?->warn('ProductImagesSeeder: no hay productos activos.');

            return;
        }

        foreach ($products as $index => $producto) {
            $producto->imagenes()->delete();

            $mainPath = $paths[$index % count($paths)];
            $extraPath = $paths[($index + 3) % count($paths)];

            $this->attachImage($producto->id, $mainPath, true);
            if ($extraPath !== $mainPath) {
                $this->attachImage($producto->id, $extraPath, false);
            }
        }

        $this->command?->info(sprintf(
            'ProductImagesSeeder: %d producto(s) con fotos (%d archivos disponibles).',
            $products->count(),
            count($paths)
        ));
    }

    /** @return list<string> Rutas relativas al disco public (productos/...) */
    private function resolveImagePaths(): array
    {
        $disk = Storage::disk('public');
        if (! $disk->exists('productos')) {
            return [];
        }

        $available = collect($disk->files('productos'))
            ->filter(fn (string $path) => (bool) preg_match('/\.(jpe?g|png|webp|gif)$/i', $path))
            ->values();

        $ordered = collect(self::PREFERRED)
            ->map(fn (string $name) => 'productos/'.$name)
            ->filter(fn (string $path) => $available->contains($path));

        $rest = $available->diff($ordered)->values();

        return $ordered->merge($rest)->values()->all();
    }

    private function attachImage(int $productoId, string $relativePath, bool $principal): void
    {
        Imagen::query()->create([
            'producto_id' => $productoId,
            'nombre' => basename($relativePath),
            'ruta' => $relativePath,
            'es_principal' => $principal,
        ]);
    }
}
