<?php

namespace App\Services\AutoCoach;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use RuntimeException;

class AutoCoachUploadService
{
    public function __construct(
        private readonly AutoCoachSessionService $sessions,
    ) {}

    /**
     * @param  UploadedFile[]  $files
     * @return array{uploaded: array<int, array{id: string, url: string, name: string}>, errors: string[]}
     */
    public function storeBatch(string $sessionId, string $ip, array $files): array
    {
        if (! $this->sessions->isValidSessionId($sessionId)) {
            throw new RuntimeException('Sesión no válida.');
        }

        $maxBatch = (int) config('autocoach.max_files_per_batch', 10);
        $maxFile = (int) config('autocoach.max_file_bytes');
        $maxSession = (int) config('autocoach.max_session_bytes');

        if (count($files) > $maxBatch) {
            throw new RuntimeException("Solo puedes subir {$maxBatch} vídeos a la vez.");
        }

        $reservedQuota = count($files);
        $this->reserveIpQuota($ip, $reservedQuota);

        try {
            $this->assertGlobalStorageCapacity($this->estimateIncomingBytes($files, $maxFile));

            $uploaded = [];
            $errors = [];
            $dir = $this->sessions->sessionDirectory($sessionId);

            if (! File::isDirectory($dir)) {
                File::makeDirectory($dir, 0755, true);
            }

            $currentSize = $this->directorySize($dir);

            foreach ($files as $file) {
                if (! $file instanceof UploadedFile || ! $file->isValid()) {
                    $errors[] = 'Archivo no válido.';
                    continue;
                }

                if ($file->getSize() > $maxFile) {
                    $errors[] = "{$file->getClientOriginalName()}: supera el tamaño máximo por clip.";
                    continue;
                }

                $formatError = $this->validateVideoFile($file);
                if ($formatError !== null) {
                    $errors[] = "{$file->getClientOriginalName()}: {$formatError}";
                    continue;
                }

                $fileSize = $file->getSize();

                if ($currentSize + $fileSize > $maxSession) {
                    $errors[] = 'Has alcanzado el límite de almacenamiento temporal de esta sesión.';
                    break;
                }

                $this->assertGlobalStorageCapacity($fileSize);

                $ext = strtolower($file->getClientOriginalExtension());
                $safeBase = Str::slug(pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME)) ?: 'clip';
                $filename = $safeBase.'_'.Str::random(8).'.'.$ext;
                $originalName = $file->getClientOriginalName();
                $file->move($dir, $filename);

                $currentSize += $fileSize;

                $uploaded[] = [
                    'id' => $filename,
                    'name' => $originalName,
                    'url' => route('autocoach.uploads.show', [
                        'session' => $sessionId,
                        'filename' => $filename,
                    ]),
                ];
            }

            $this->sessions->touchSession($sessionId);
            $this->releaseIpQuota($ip, $reservedQuota - count($uploaded));

            return compact('uploaded', 'errors');
        } catch (\Throwable $e) {
            $this->releaseIpQuota($ip, $reservedQuota);
            throw $e;
        }
    }

    /**
     * Elimina todos los vídeos temporales de la sesión del usuario.
     */
    public function deleteSessionUploads(string $sessionId): int
    {
        if (! $this->sessions->isValidSessionId($sessionId)) {
            return 0;
        }

        $dir = $this->sessions->sessionDirectory($sessionId);
        if (! File::isDirectory($dir)) {
            return 0;
        }

        $count = count(File::files($dir));
        File::deleteDirectory($dir);

        return $count;
    }

    private function validateVideoFile(UploadedFile $file): ?string
    {
        $ext = strtolower($file->getClientOriginalExtension());
        $allowedExtensions = config('autocoach.allowed_extensions', []);
        $allowedMimes = config('autocoach.allowed_mimes', []);

        if (! in_array($ext, $allowedExtensions, true)) {
            return 'formato no permitido (MP4, MOV, WebM).';
        }

        $realPath = $file->getRealPath();
        if ($realPath === false) {
            return 'archivo no legible.';
        }

        $detectedMime = mime_content_type($realPath) ?: '';
        if (! in_array($detectedMime, $allowedMimes, true)) {
            return 'formato no permitido (MP4, MOV, WebM).';
        }

        return null;
    }

    /**
     * @param  UploadedFile[]  $files
     */
    private function estimateIncomingBytes(array $files, int $maxFile): int
    {
        $total = 0;
        foreach ($files as $file) {
            if ($file instanceof UploadedFile && $file->isValid()) {
                $total += min($file->getSize(), $maxFile);
            }
        }

        return $total;
    }

    private function assertGlobalStorageCapacity(int $incomingBytes): void
    {
        if ($incomingBytes < 1) {
            return;
        }

        $maxTotal = (int) config('autocoach.max_total_upload_bytes');
        if ($this->totalUploadsSize() + $incomingBytes > $maxTotal) {
            throw new RuntimeException(
                'El servidor está temporalmente al límite de almacenamiento. Inténtalo más tarde.',
            );
        }
    }

    private function totalUploadsSize(): int
    {
        $root = $this->sessions->uploadsRoot();
        if (! File::isDirectory($root)) {
            return 0;
        }

        $size = 0;
        foreach (File::directories($root) as $directory) {
            foreach (File::files($directory) as $file) {
                $size += $file->getSize();
            }
        }

        return $size;
    }

    private function reserveIpQuota(string $ip, int $count): void
    {
        if ($count < 1) {
            return;
        }

        $quota = (int) config('autocoach.ip_upload_quota', 40);
        $minutes = (int) config('autocoach.ip_quota_window_minutes', 5);
        $key = $this->ipQuotaKey($ip);
        $lock = Cache::lock($key.':lock', 10);

        $lock->block(5, function () use ($key, $quota, $count, $minutes): void {
            $current = (int) Cache::get($key, 0);
            if ($current + $count > $quota) {
                throw new RuntimeException(
                    'Has alcanzado el cupo de subidas por IP. Vuelve a intentarlo en unos minutos.',
                );
            }
            Cache::put($key, $current + $count, now()->addMinutes($minutes));
        });
    }

    private function releaseIpQuota(string $ip, int $count): void
    {
        if ($count < 1) {
            return;
        }

        $minutes = (int) config('autocoach.ip_quota_window_minutes', 5);
        $key = $this->ipQuotaKey($ip);
        $lock = Cache::lock($key.':lock', 10);

        $lock->block(5, function () use ($key, $count, $minutes): void {
            $current = max(0, (int) Cache::get($key, 0) - $count);
            Cache::put($key, $current, now()->addMinutes($minutes));
        });
    }

    private function ipQuotaKey(string $ip): string
    {
        return 'autocoach:ip_uploads:'.sha1($ip);
    }

    private function directorySize(string $directory): int
    {
        if (! File::isDirectory($directory)) {
            return 0;
        }

        $size = 0;
        foreach (File::files($directory) as $file) {
            $size += $file->getSize();
        }

        return $size;
    }
}
