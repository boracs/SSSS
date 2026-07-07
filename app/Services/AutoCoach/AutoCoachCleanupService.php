<?php

namespace App\Services\AutoCoach;

use Illuminate\Support\Facades\File;

class AutoCoachCleanupService
{
    public function __construct(
        private readonly AutoCoachSessionService $sessions,
    ) {}

    public function cleanupExpiredUploads(): int
    {
        $root = storage_path('app/public/autocoach/uploads');
        if (! File::isDirectory($root)) {
            return 0;
        }

        $ttlSeconds = (int) config('autocoach.upload_ttl_minutes', 30) * 60;
        $deleted = 0;

        foreach (File::directories($root) as $dir) {
            $lastModified = filemtime($dir) ?: 0;
            if (time() - $lastModified <= $ttlSeconds) {
                continue;
            }

            File::deleteDirectory($dir);
            $deleted++;
        }

        return $deleted;
    }
}
