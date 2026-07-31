<?php

declare(strict_types=1);

namespace App\Support\AutoCoach;

/**
 * Lee la duración de un vídeo sin dependencias externas.
 * - Preferencia: ffprobe si está en PATH.
 * - Fallback: átomo mvhd de MP4/MOV (ISO BMFF / QuickTime).
 */
final class VideoDurationProbe
{
    public function seconds(string $path): ?float
    {
        if (! is_file($path) || ! is_readable($path)) {
            return null;
        }

        $fromFfprobe = $this->fromFfprobe($path);
        if ($fromFfprobe !== null) {
            return $fromFfprobe;
        }

        return $this->fromIsoBmffMvhd($path);
    }

    private function fromFfprobe(string $path): ?float
    {
        if (! function_exists('proc_open')) {
            return null;
        }

        $cmd = ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', $path];
        $descriptors = [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ];
        $proc = @proc_open($cmd, $descriptors, $pipes, null, null, ['bypass_shell' => true]);
        if (! is_resource($proc)) {
            return null;
        }

        fclose($pipes[0]);
        $out = trim((string) stream_get_contents($pipes[1]));
        fclose($pipes[1]);
        fclose($pipes[2]);
        $code = proc_close($proc);

        if ($code !== 0 || $out === '' || ! is_numeric($out)) {
            return null;
        }

        $seconds = (float) $out;

        return $seconds > 0 ? $seconds : null;
    }

    private function fromIsoBmffMvhd(string $path): ?float
    {
        $handle = @fopen($path, 'rb');
        if ($handle === false) {
            return null;
        }

        try {
            $size = filesize($path);
            if ($size === false || $size < 32) {
                return null;
            }

            return $this->scanBoxes($handle, 0, (int) $size, 0);
        } finally {
            fclose($handle);
        }
    }

    /**
     * @param  resource  $handle
     */
    private function scanBoxes($handle, int $offset, int $end, int $depth): ?float
    {
        if ($depth > 12) {
            return null;
        }

        $pos = $offset;
        while ($pos + 8 <= $end) {
            fseek($handle, $pos);
            $header = fread($handle, 8);
            if ($header === false || strlen($header) < 8) {
                return null;
            }

            $boxSize = unpack('N', substr($header, 0, 4))[1];
            $type = substr($header, 4, 4);
            $headerSize = 8;

            if ($boxSize === 1) {
                $ext = fread($handle, 8);
                if ($ext === false || strlen($ext) < 8) {
                    return null;
                }
                $hi = unpack('N', substr($ext, 0, 4))[1];
                $lo = unpack('N', substr($ext, 4, 4))[1];
                $boxSize = ($hi << 32) + $lo;
                $headerSize = 16;
            } elseif ($boxSize === 0) {
                $boxSize = $end - $pos;
            }

            if ($boxSize < $headerSize || $pos + $boxSize > $end) {
                return null;
            }

            $contentStart = $pos + $headerSize;
            $contentEnd = $pos + $boxSize;

            if ($type === 'moov' || $type === 'trak' || $type === 'mdia' || $type === 'minf') {
                $nested = $this->scanBoxes($handle, $contentStart, $contentEnd, $depth + 1);
                if ($nested !== null) {
                    return $nested;
                }
            }

            if ($type === 'mvhd') {
                return $this->parseMvhd($handle, $contentStart, $contentEnd - $contentStart);
            }

            $pos += $boxSize;
        }

        return null;
    }

    /**
     * @param  resource  $handle
     */
    private function parseMvhd($handle, int $start, int $length): ?float
    {
        if ($length < 20) {
            return null;
        }

        fseek($handle, $start);
        $versionByte = fread($handle, 1);
        if ($versionByte === false) {
            return null;
        }
        $version = ord($versionByte);

        if ($version === 1) {
            if ($length < 32) {
                return null;
            }
            fseek($handle, $start + 1 + 3 + 8 + 8);
            $raw = fread($handle, 12);
            if ($raw === false || strlen($raw) < 12) {
                return null;
            }
            $timescale = unpack('N', substr($raw, 0, 4))[1];
            $durationHi = unpack('N', substr($raw, 4, 4))[1];
            $durationLo = unpack('N', substr($raw, 8, 4))[1];
            $duration = ($durationHi << 32) + $durationLo;
        } else {
            if ($length < 20) {
                return null;
            }
            fseek($handle, $start + 1 + 3 + 4 + 4);
            $raw = fread($handle, 8);
            if ($raw === false || strlen($raw) < 8) {
                return null;
            }
            $timescale = unpack('N', substr($raw, 0, 4))[1];
            $duration = unpack('N', substr($raw, 4, 4))[1];
        }

        if ($timescale < 1 || $duration < 1) {
            return null;
        }

        return $duration / $timescale;
    }
}
