<?php

declare(strict_types=1);

namespace App\Services\Store;

use App\DTOs\Store\StoreProductWriteDto;
use App\Enums\ProductTag;
use App\Models\Imagen;
use App\Models\Producto;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use InvalidArgumentException;

final class StoreProductCatalogService
{
    /**
     * @return list<array<string, mixed>>
     */
    public function adminIndexRows(): array
    {
        return Producto::query()
            ->with('imagenes')
            ->orderBy('nombre')
            ->orderBy('id')
            ->get()
            ->map(function (Producto $producto): array {
                $principal = $producto->imagenes->firstWhere('es_principal', 1)
                    ?? $producto->imagenes->first();

                return [
                    'id' => $producto->id,
                    'nombre' => $producto->nombre,
                    'precio' => StoreProductPricing::catalogEuros($producto->precio),
                    'unidades' => (int) $producto->unidades,
                    'descuento' => (float) ($producto->descuento ?? 0),
                    'eliminado' => (bool) $producto->eliminado,
                    'tags' => $producto->normalizedTags(),
                    'tag_labels' => ProductTag::labelsFor($producto->normalizedTags()),
                    'imagen_principal' => Producto::publicImageUrl($principal?->ruta),
                ];
            })
            ->values()
            ->all();
    }

    /**
     * @param  list<UploadedFile>  $images
     */
    public function create(StoreProductWriteDto $dto, array $images = []): Producto
    {
        return DB::transaction(function () use ($dto, $images): Producto {
            $producto = new Producto();
            $this->fillFromDto($producto, $dto);
            $producto->save();

            $this->storeImages($producto, $images, replaceExisting: false);

            return $producto->fresh(['imagenes']) ?? $producto;
        });
    }

    /**
     * @param  list<UploadedFile>  $images
     */
    public function update(Producto $producto, StoreProductWriteDto $dto, array $images = []): Producto
    {
        return DB::transaction(function () use ($producto, $dto, $images): Producto {
            $locked = Producto::query()->whereKey($producto->id)->lockForUpdate()->firstOrFail();
            $this->fillFromDto($locked, $dto);
            $locked->save();

            if ($images !== []) {
                $this->storeImages($locked, $images, replaceExisting: true);
            }

            return $locked->fresh(['imagenes']) ?? $locked;
        });
    }

    public function toggleEliminado(Producto $producto): Producto
    {
        return DB::transaction(function () use ($producto): Producto {
            $locked = Producto::query()->whereKey($producto->id)->lockForUpdate()->firstOrFail();
            $locked->eliminado = ! (bool) $locked->eliminado;
            $locked->save();

            return $locked;
        });
    }

    public function setPrincipalImage(Producto $producto, int $imageId): void
    {
        DB::transaction(function () use ($producto, $imageId): void {
            $locked = Producto::query()->whereKey($producto->id)->lockForUpdate()->firstOrFail();

            $belongs = $locked->imagenes()->whereKey($imageId)->exists();
            if (! $belongs) {
                throw new InvalidArgumentException('La imagen no pertenece a este producto.');
            }

            $locked->imagenes()->update(['es_principal' => 0]);
            $locked->imagenes()->whereKey($imageId)->update(['es_principal' => 1]);
        });
    }

    /**
     * @return list<array{id: int, url: string, es_principal: bool}>
     */
    public function imagesForJson(Producto $producto): array
    {
        return $producto->imagenes
            ->sortByDesc('es_principal')
            ->values()
            ->map(static fn (Imagen $img): array => [
                'id' => (int) $img->id,
                'url' => Producto::publicImageUrl($img->ruta) ?? '',
                'es_principal' => (bool) $img->es_principal,
            ])
            ->all();
    }

    private function fillFromDto(Producto $producto, StoreProductWriteDto $dto): void
    {
        $producto->fill([
            'nombre' => $dto->nombre,
            'precio' => $dto->precioEuros,
            'unidades' => $dto->unidades,
            'descuento' => $dto->descuentoPercent,
            'eliminado' => $dto->eliminado,
        ]);
        $producto->syncTags($dto->tags);
    }

    /**
     * @param  list<UploadedFile>  $images
     */
    private function storeImages(Producto $producto, array $images, bool $replaceExisting): void
    {
        $files = array_values(array_filter(
            $images,
            static fn (mixed $file): bool => $file instanceof UploadedFile && $file->isValid(),
        ));

        if ($files === []) {
            return;
        }

        if ($replaceExisting) {
            $producto->loadMissing('imagenes');
            foreach ($producto->imagenes as $imagen) {
                if (Storage::disk('public')->exists($imagen->ruta)) {
                    Storage::disk('public')->delete($imagen->ruta);
                }
                $imagen->delete();
            }
        }

        foreach ($files as $index => $image) {
            $imagePath = $image->store('productos', 'public');
            $producto->imagenes()->create([
                'nombre' => $image->getClientOriginalName(),
                'ruta' => $imagePath,
                'es_principal' => $index === 0,
            ]);
        }
    }
}
