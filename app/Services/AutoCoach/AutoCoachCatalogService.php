<?php

namespace App\Services\AutoCoach;

use App\Models\AutoCoachReferenceVideo;
use Illuminate\Support\Collection;

class AutoCoachCatalogService
{
    public function sports(): array
    {
        return AutoCoachReferenceVideo::query()
            ->distinct()
            ->orderBy('sport')
            ->pluck('sport')
            ->values()
            ->all();
    }

    public function postures(string $sport): array
    {
        return AutoCoachReferenceVideo::query()
            ->where('sport', $sport)
            ->distinct()
            ->orderBy('posture')
            ->pluck('posture')
            ->values()
            ->all();
    }

    /** @return Collection<int, array{trick: string, url: string}> */
    public function tricksWithUrls(string $sport, string $posture): Collection
    {
        return AutoCoachReferenceVideo::query()
            ->where('sport', $sport)
            ->where('posture', $posture)
            ->orderBy('trick')
            ->get()
            ->map(fn (AutoCoachReferenceVideo $row) => [
                'trick' => $row->trick,
                'url' => $this->publicUrl($row->file_path),
            ]);
    }

    public function resolveVideoUrl(string $sport, string $posture, string $trick): ?string
    {
        $row = AutoCoachReferenceVideo::query()
            ->where('sport', $sport)
            ->where('posture', $posture)
            ->where('trick', $trick)
            ->first();

        return $row ? $this->publicUrl($row->file_path) : null;
    }

    public function publicUrl(string $filePath): string
    {
        return '/storage/'.ltrim(str_replace('\\', '/', $filePath), '/');
    }
}
