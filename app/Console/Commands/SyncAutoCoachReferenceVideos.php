<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class SyncAutoCoachReferenceVideos extends Command
{
    protected $signature = 'autocoach:sync-reference-videos';

    protected $description = 'Copia vídeos de referencia al disco public/autocoach/videos (fuente opcional vía config)';

    public function handle(): int
    {
        $target = storage_path('app/public/autocoach/videos');
        $source = config('autocoach.reference_videos_source');

        if (is_string($source) && $source !== '' && File::isDirectory($source)) {
            File::ensureDirectoryExists($target);
            File::copyDirectory($source, $target);
            $this->info("Vídeos de referencia copiados desde {$source}");

            return self::SUCCESS;
        }

        if (File::isDirectory($target) && count(File::allFiles($target)) > 0) {
            $this->info('Vídeos de referencia ya presentes en storage/app/public/autocoach/videos.');

            return self::SUCCESS;
        }

        $this->error(
            'No hay vídeos en storage. Define AUTOCOACH_REFERENCE_VIDEOS_SOURCE apuntando a una carpeta con los clips de referencia.'
        );

        return self::FAILURE;
    }
}
