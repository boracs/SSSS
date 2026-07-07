<?php

namespace App\Services\AutoCoach;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Cookie;

class AutoCoachSessionService
{
    public const COOKIE = 'autocoach_sid';

    private const SESSION_ID_PATTERN = '/^[a-zA-Z0-9_-]{16,64}$/';

    public function resolveSessionId(Request $request): string
    {
        $existing = $request->cookie(self::COOKIE);
        if (is_string($existing) && $this->isValidSessionId($existing)) {
            return $existing;
        }

        return 'ac_'.Str::random(32);
    }

    public function isValidSessionId(string $sessionId): bool
    {
        return (bool) preg_match(self::SESSION_ID_PATTERN, $sessionId);
    }

    public function uploadsRoot(): string
    {
        return storage_path('app/public/autocoach/uploads');
    }

    public function sessionDirectory(string $sessionId): string
    {
        if (! $this->isValidSessionId($sessionId)) {
            throw new \InvalidArgumentException('Identificador de sesión no válido.');
        }

        return $this->uploadsRoot().DIRECTORY_SEPARATOR.$sessionId;
    }

    /**
     * Resuelve la ruta absoluta de un clip almacenado verificando que no salga del directorio raíz.
     */
    public function resolveStoredFilePath(string $sessionId, string $filename): ?string
    {
        if (! $this->isValidSessionId($sessionId)) {
            return null;
        }

        if (! preg_match('/^[a-zA-Z0-9._-]+$/', $filename)) {
            return null;
        }

        $root = $this->uploadsRoot();
        if (! File::isDirectory($root)) {
            return null;
        }

        $candidate = $this->sessionDirectory($sessionId).DIRECTORY_SEPARATOR.$filename;
        if (! File::isFile($candidate)) {
            return null;
        }

        $rootReal = realpath($root);
        $fileReal = realpath($candidate);
        if ($rootReal === false || $fileReal === false) {
            return null;
        }

        if (! str_starts_with($fileReal, $rootReal.DIRECTORY_SEPARATOR)) {
            return null;
        }

        return $fileReal;
    }

    public function assertCookieMatchesSession(Request $request, string $sessionId): void
    {
        $cookieSession = $request->cookie(self::COOKIE);
        if (! is_string($cookieSession) || ! $this->isValidSessionId($cookieSession) || ! hash_equals($cookieSession, $sessionId)) {
            abort(403);
        }
    }

    public function queueSessionCookie(string $sessionId): void
    {
        if (! $this->isValidSessionId($sessionId)) {
            return;
        }

        \Illuminate\Support\Facades\Cookie::queue($this->makeSessionCookie($sessionId));
    }

    public function makeSessionCookie(string $sessionId): Cookie
    {
        return cookie(
            self::COOKIE,
            $sessionId,
            $this->cookieMinutes(),
            '/',
            null,
            (bool) config('autocoach.cookie_secure', false),
            true,
            false,
            'Lax',
        );
    }

    public function touchSession(string $sessionId): void
    {
        $dir = $this->sessionDirectory($sessionId);
        if (File::isDirectory($dir)) {
            @touch($dir);
        }
    }

    public function cookieMinutes(): int
    {
        return (int) config('autocoach.upload_ttl_minutes', 30);
    }
}
