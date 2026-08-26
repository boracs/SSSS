<?php

declare(strict_types=1);

namespace App\Services\Media;

use App\DTOs\Media\CatalogImageStoredDto;
use GdImage;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Throwable;

/**
 * Variantes de catálogo: máster WebP ~1600 px + thumb `{stem}-thumb.webp` ~640 px.
 * El RAW del móvil se borra solo si el máster existe en disco.
 */
final class CatalogImageService
{
    public const DISK = 'public';

    public const MASTER_MAX_EDGE = 1600;

    public const THUMB_MAX_EDGE = 640;

    public const WEBP_QUALITY = 80;

    private const PASSTHROUGH_EXTENSIONS = ['svg', 'gif'];

    public function storeFromUpload(UploadedFile $file, string $directory): CatalogImageStoredDto
    {
        $directory = trim($directory, '/');
        $extension = strtolower((string) ($file->getClientOriginalExtension() ?: $file->extension() ?: ''));

        if (in_array($extension, self::PASSTHROUGH_EXTENSIONS, true) || ! $this->gdReady()) {
            $path = $file->store($directory, self::DISK);

            return new CatalogImageStoredDto($path, null, true);
        }

        $rawPath = $file->store($directory, self::DISK);

        try {
            $absolute = Storage::disk(self::DISK)->path($rawPath);
            $stem = pathinfo($rawPath, PATHINFO_FILENAME);
            $stored = $this->writeVariantsFromAbsolute($absolute, $directory, $stem);
            if ($stored->masterPath !== $rawPath) {
                Storage::disk(self::DISK)->delete($rawPath);
            }

            return $stored;
        } catch (Throwable $e) {
            Log::warning('CatalogImageService: no se pudo generar máster/thumb; se conserva el original.', [
                'path' => $rawPath,
                'error' => $e->getMessage(),
            ]);

            return new CatalogImageStoredDto($rawPath, null, true);
        }
    }

    /**
     * @param  list<UploadedFile|null>  $files
     * @return list<string>
     */
    public function storeMany(array $files, string $directory): array
    {
        $paths = [];
        foreach ($files as $file) {
            if (! $file instanceof UploadedFile || ! $file->isValid()) {
                continue;
            }
            $paths[] = $this->storeFromUpload($file, $directory)->masterPath;
        }

        return $paths;
    }

    public function thumbPathFor(string $masterPath): ?string
    {
        $masterPath = $this->normalizeStoredPath($masterPath);
        if ($masterPath === '' || $this->isRemoteOrPublicAsset($masterPath)) {
            return null;
        }

        $stem = pathinfo($masterPath, PATHINFO_FILENAME);
        if ($stem === '' || str_ends_with($stem, '-thumb')) {
            return $masterPath;
        }

        $dir = dirname($masterPath);
        $prefix = $dir === '.' ? '' : $dir.'/';

        return $prefix.$stem.'-thumb.webp';
    }

    public function deletePair(?string $masterPath): void
    {
        if (! is_string($masterPath) || $this->isRemoteOrPublicAsset($masterPath)) {
            return;
        }

        $masterPath = $this->normalizeStoredPath($masterPath);
        if ($masterPath === '') {
            return;
        }

        $disk = Storage::disk(self::DISK);
        if ($disk->exists($masterPath)) {
            $disk->delete($masterPath);
        }

        $thumb = $this->thumbPathFor($masterPath);
        if ($thumb !== null && $thumb !== $masterPath && $disk->exists($thumb)) {
            $disk->delete($thumb);
        }
    }

    /**
     * @param  list<string|null>|null  $paths
     */
    public function deletePairs(?array $paths): void
    {
        foreach ($paths ?? [] as $path) {
            if (is_string($path) && $path !== '') {
                $this->deletePair($path);
            }
        }
    }

    public function publicMasterUrl(?string $storedPath): ?string
    {
        if (! is_string($storedPath) || trim($storedPath) === '') {
            return null;
        }

        return $this->publicUrl($this->normalizeStoredPath($storedPath));
    }

    public function publicThumbUrl(?string $storedPath): ?string
    {
        if (! is_string($storedPath) || trim($storedPath) === '') {
            return null;
        }

        $storedPath = $this->normalizeStoredPath($storedPath);
        if ($this->isRemoteOrPublicAsset($storedPath)) {
            return $this->publicUrl($storedPath);
        }

        $thumb = $this->thumbPathFor($storedPath);
        if ($thumb !== null && Storage::disk(self::DISK)->exists($thumb)) {
            return $this->publicUrl($thumb);
        }

        return $this->publicUrl($storedPath);
    }

    /**
     * Reescribe un archivo ya guardado. Idempotente si ya hay máster webp + thumb.
     *
     * @return string|null  Path del máster a persistir (null = no existe / no tocable)
     */
    public function backfillStoredPath(string $storedPath): ?string
    {
        $storedPath = $this->normalizeStoredPath($storedPath);
        if ($storedPath === '' || $this->isRemoteOrPublicAsset($storedPath)) {
            return $storedPath !== '' ? $storedPath : null;
        }

        $disk = Storage::disk(self::DISK);
        if (! $disk->exists($storedPath)) {
            return null;
        }

        $extension = strtolower((string) pathinfo($storedPath, PATHINFO_EXTENSION));
        $stem = pathinfo($storedPath, PATHINFO_FILENAME);

        if (str_ends_with($stem, '-thumb')) {
            return $storedPath;
        }

        if (in_array($extension, self::PASSTHROUGH_EXTENSIONS, true) || ! $this->gdReady()) {
            return $storedPath;
        }

        $thumb = $this->thumbPathFor($storedPath);
        if ($extension === 'webp' && $thumb !== null && $disk->exists($thumb)) {
            return $storedPath;
        }

        try {
            $absolute = $disk->path($storedPath);
            $directory = dirname($storedPath);
            $directory = $directory === '.' ? '' : $directory;
            $stored = $this->writeVariantsFromAbsolute($absolute, $directory, $stem);
            if ($stored->masterPath !== $storedPath) {
                $disk->delete($storedPath);
            }

            return $stored->masterPath;
        } catch (Throwable $e) {
            Log::warning('CatalogImageService backfill: se deja el original.', [
                'path' => $storedPath,
                'error' => $e->getMessage(),
            ]);

            return $storedPath;
        }
    }

    public function gdReady(): bool
    {
        return extension_loaded('gd') && function_exists('imagewebp');
    }

    private function writeVariantsFromAbsolute(string $absoluteSource, string $directory, string $stem): CatalogImageStoredDto
    {
        $source = $this->loadGdImage($absoluteSource);
        $source = $this->applyExifOrientation($absoluteSource, $source);

        $masterImage = $this->scaleDown($source, self::MASTER_MAX_EDGE);
        $thumbImage = $this->scaleDown($source, self::THUMB_MAX_EDGE);
        imagedestroy($source);

        $directory = trim($directory, '/');
        $masterRel = ($directory !== '' ? $directory.'/' : '').$stem.'.webp';
        $thumbRel = ($directory !== '' ? $directory.'/' : '').$stem.'-thumb.webp';

        $this->encodeWebp($masterImage, Storage::disk(self::DISK)->path($masterRel));
        imagedestroy($masterImage);
        $this->encodeWebp($thumbImage, Storage::disk(self::DISK)->path($thumbRel));
        imagedestroy($thumbImage);

        if (! Storage::disk(self::DISK)->exists($masterRel)) {
            throw new \RuntimeException('El máster WebP no se escribió en disco.');
        }

        return new CatalogImageStoredDto($masterRel, $thumbRel, false);
    }

    private function loadGdImage(string $absolutePath): GdImage
    {
        $info = @getimagesize($absolutePath);
        $type = is_array($info) ? (int) ($info[2] ?? 0) : 0;

        $image = match ($type) {
            IMAGETYPE_JPEG => @imagecreatefromjpeg($absolutePath),
            IMAGETYPE_PNG => @imagecreatefrompng($absolutePath),
            IMAGETYPE_WEBP => @imagecreatefromwebp($absolutePath),
            IMAGETYPE_BMP => function_exists('imagecreatefrombmp') ? @imagecreatefrombmp($absolutePath) : false,
            default => false,
        };

        if (! $image instanceof GdImage) {
            throw new \RuntimeException('GD no pudo leer la imagen.');
        }

        return $image;
    }

    private function applyExifOrientation(string $absolutePath, GdImage $image): GdImage
    {
        if (! function_exists('exif_read_data')) {
            return $image;
        }

        $exif = @exif_read_data($absolutePath);
        $orientation = is_array($exif) ? (int) ($exif['Orientation'] ?? 1) : 1;

        $rotated = match ($orientation) {
            3 => imagerotate($image, 180, 0),
            6 => imagerotate($image, -90, 0),
            8 => imagerotate($image, 90, 0),
            default => false,
        };

        if ($rotated instanceof GdImage) {
            imagedestroy($image);

            return $rotated;
        }

        return $image;
    }

    private function scaleDown(GdImage $source, int $maxEdge): GdImage
    {
        $width = imagesx($source);
        $height = imagesy($source);
        $longEdge = max($width, $height);

        if ($longEdge <= $maxEdge) {
            $clone = imagecreatetruecolor($width, $height);
            $this->preserveAlpha($clone, $source);
            imagecopy($clone, $source, 0, 0, 0, 0, $width, $height);

            return $clone;
        }

        $scale = $maxEdge / $longEdge;
        $newW = max(1, (int) round($width * $scale));
        $newH = max(1, (int) round($height * $scale));
        $dest = imagecreatetruecolor($newW, $newH);
        $this->preserveAlpha($dest, $source);
        imagecopyresampled($dest, $source, 0, 0, 0, 0, $newW, $newH, $width, $height);

        return $dest;
    }

    private function preserveAlpha(GdImage $dest, GdImage $source): void
    {
        imagealphablending($dest, false);
        imagesavealpha($dest, true);
        $transparent = imagecolorallocatealpha($dest, 0, 0, 0, 127);
        imagefilledrectangle($dest, 0, 0, imagesx($dest), imagesy($dest), $transparent);
        imagealphablending($dest, true);
        unset($source);
    }

    private function encodeWebp(GdImage $image, string $absoluteDest): void
    {
        $dir = dirname($absoluteDest);
        if (! is_dir($dir) && ! mkdir($dir, 0755, true) && ! is_dir($dir)) {
            throw new \RuntimeException('No se pudo crear el directorio de la variante.');
        }

        imagealphablending($image, true);
        imagesavealpha($image, true);

        if (! imagewebp($image, $absoluteDest, self::WEBP_QUALITY)) {
            throw new \RuntimeException('imagewebp falló.');
        }
    }

    private function publicUrl(string $path): string
    {
        $path = ltrim($path, '/');

        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }

        if (str_starts_with($path, 'img/') || str_starts_with($path, 'images/')) {
            return asset($path);
        }

        if (str_starts_with($path, '/storage/')) {
            return asset(ltrim($path, '/'));
        }

        if (str_starts_with($path, '/')) {
            return asset(ltrim($path, '/'));
        }

        return asset('storage/'.$path);
    }

    private function isRemoteOrPublicAsset(string $path): bool
    {
        $path = ltrim($path, '/');

        return str_starts_with($path, 'http://')
            || str_starts_with($path, 'https://')
            || str_starts_with($path, 'img/')
            || str_starts_with($path, 'images/');
    }

    private function normalizeStoredPath(string $path): string
    {
        $path = trim($path);
        $path = ltrim($path, '/');

        if (str_starts_with($path, 'storage/')) {
            $path = substr($path, strlen('storage/'));
        }

        return $path;
    }
}
