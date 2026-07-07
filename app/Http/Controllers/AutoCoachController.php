<?php

namespace App\Http\Controllers;

use App\Http\Requests\AutoCoach\CatalogQueryRequest;
use App\Http\Requests\AutoCoach\UploadVideosRequest;
use App\Support\IniSize;
use App\Services\AutoCoach\AutoCoachCatalogService;
use App\Services\AutoCoach\AutoCoachSessionService;
use App\Services\AutoCoach\AutoCoachUploadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class AutoCoachController extends Controller
{
    public function __construct(
        private readonly AutoCoachCatalogService $catalog,
        private readonly AutoCoachUploadService $uploads,
        private readonly AutoCoachSessionService $sessions,
    ) {}

    public function index(Request $request): Response
    {
        $sessionId = $this->sessions->resolveSessionId($request);
        $this->sessions->queueSessionCookie($sessionId);

        $maxFileBytes = (int) config('autocoach.max_file_bytes');
        $maxBatch = (int) config('autocoach.max_files_per_batch', 10);
        $maxBatchBytes = min(
            $maxBatch * $maxFileBytes,
            (int) config('autocoach.max_session_bytes'),
            IniSize::toBytes((string) ini_get('post_max_size')),
        );
        $serverPostLimitMb = (int) floor(IniSize::toBytes((string) ini_get('post_max_size')) / 1024 / 1024);

        return Inertia::render('AutoCoach/Index', [
            'limits' => [
                'maxBatch' => $maxBatch,
                'maxFileMb' => (int) ($maxFileBytes / 1024 / 1024),
                'maxBatchMb' => max(1, (int) floor($maxBatchBytes / 1024 / 1024)),
                'serverPostLimitMb' => max(1, $serverPostLimitMb),
                'ttlMinutes' => (int) config('autocoach.upload_ttl_minutes', 30),
                'ipQuotaWindow' => (int) config('autocoach.ip_quota_window_minutes', 5),
            ],
        ]);
    }

    public function sports(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'sports' => $this->catalog->sports(),
        ]);
    }

    public function postures(CatalogQueryRequest $request): JsonResponse
    {
        $sport = trim((string) $request->query('sport'));

        return response()->json([
            'success' => true,
            'postures' => $this->catalog->postures($sport),
        ]);
    }

    public function tricks(CatalogQueryRequest $request): JsonResponse
    {
        $sport = trim((string) $request->query('sport'));
        $posture = trim((string) $request->query('posture'));

        return response()->json([
            'success' => true,
            'tricks' => $this->catalog->tricksWithUrls($sport, $posture)->values(),
        ]);
    }

    public function video(CatalogQueryRequest $request): JsonResponse
    {
        $sport = trim((string) $request->query('sport'));
        $posture = trim((string) $request->query('posture'));
        $trick = trim((string) $request->query('trick'));

        $url = $this->catalog->resolveVideoUrl($sport, $posture, $trick);
        if (! $url) {
            return response()->json(['success' => false, 'message' => 'No se encontró el vídeo.'], 404);
        }

        return response()->json(['success' => true, 'video_url' => $url]);
    }

    public function upload(UploadVideosRequest $request): JsonResponse
    {
        $sessionId = $this->sessions->resolveSessionId($request);
        $files = array_values(array_filter($request->file('videos', [])));

        try {
            $result = $this->uploads->storeBatch($sessionId, $request->ip() ?? '0.0.0.0', $files);
        } catch (RuntimeException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 429);
        }

        return response()
            ->json([
                'success' => count($result['uploaded']) > 0,
                'uploaded' => $result['uploaded'],
                'errors' => $result['errors'],
                'message' => count($result['uploaded']) > 0
                    ? 'Vídeos subidos correctamente.'
                    : 'No se pudo subir ningún vídeo.',
            ])
            ->withCookie($this->sessions->makeSessionCookie($sessionId));
    }

    public function destroyUploads(Request $request): JsonResponse
    {
        $sessionId = $request->cookie(AutoCoachSessionService::COOKIE);
        if (! is_string($sessionId) || ! $this->sessions->isValidSessionId($sessionId)) {
            return response()->json([
                'success' => false,
                'message' => 'No hay vídeos asociados a esta sesión.',
            ], 422);
        }

        $deleted = $this->uploads->deleteSessionUploads($sessionId);

        return response()->json([
            'success' => true,
            'deleted' => $deleted,
            'message' => $deleted > 0
                ? 'Tus vídeos se han eliminado del servidor.'
                : 'No había vídeos guardados en esta sesión.',
        ]);
    }

    public function showUpload(Request $request, string $session, string $filename): BinaryFileResponse
    {
        $this->sessions->assertCookieMatchesSession($request, $session);

        $path = $this->sessions->resolveStoredFilePath($session, $filename);
        if ($path === null) {
            abort(404);
        }

        return response()->file($path);
    }
}
