<?php

declare(strict_types=1);

namespace App\Services\SurfConditions;

use App\DTOs\SurfConditions\SurfBriefReactionsDto;
use App\Models\SurfBriefVote;
use App\Models\SurfDailyBrief;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use RuntimeException;

/**
 * Votos 👍/👎 del Parte S4 del día. Un voto por visitante (clave de sesión),
 * con toggle (mismo gesto quita el voto) y cambio de sentido.
 */
final class SurfBriefReactionService
{
    private const BRIEF_CACHE_PREFIX = 'surf_daily_brief:';

    public function voterKey(Request $request): string
    {
        $sessionId = $request->session()->getId();
        if ($sessionId === '') {
            $sessionId = $request->ip().'|'.$request->userAgent();
        }

        return hash('sha256', $sessionId.'|'.(string) config('app.key'));
    }

    public function stateForBrief(SurfDailyBrief $brief, ?string $voterKey = null): SurfBriefReactionsDto
    {
        $mine = null;
        if ($voterKey !== null && $voterKey !== '') {
            $mine = SurfBriefVote::query()
                ->where('surf_daily_brief_id', $brief->id)
                ->where('voter_key', $voterKey)
                ->value('reaction');
        }

        return new SurfBriefReactionsDto(
            likes: (int) $brief->likes_count,
            dislikes: (int) $brief->dislikes_count,
            mine: is_string($mine) ? $mine : null,
        );
    }

    public function voteForToday(string $reaction, string $voterKey): SurfBriefReactionsDto
    {
        if (! in_array($reaction, [SurfBriefVote::UP, SurfBriefVote::DOWN], true)) {
            throw new InvalidArgumentException('Reacción no válida.');
        }

        if ($voterKey === '') {
            throw new InvalidArgumentException('Visitante no identificable.');
        }

        $today = Carbon::today()->toDateString();

        return DB::transaction(function () use ($reaction, $voterKey, $today): SurfBriefReactionsDto {
            $brief = SurfDailyBrief::query()
                ->where('report_date', $today)
                ->lockForUpdate()
                ->first();

            if ($brief === null || $brief->summary_source === SurfDailyBrief::SOURCE_PENDING) {
                throw new RuntimeException('No hay parte de hoy para votar.');
            }

            $existing = SurfBriefVote::query()
                ->where('surf_daily_brief_id', $brief->id)
                ->where('voter_key', $voterKey)
                ->lockForUpdate()
                ->first();

            if ($existing === null) {
                SurfBriefVote::query()->create([
                    'surf_daily_brief_id' => $brief->id,
                    'reaction' => $reaction,
                    'voter_key' => $voterKey,
                ]);
                $this->bump($brief, $reaction, 1);
            } elseif ($existing->reaction === $reaction) {
                $existing->delete();
                $this->bump($brief, $reaction, -1);
            } else {
                $previous = $existing->reaction;
                $existing->update(['reaction' => $reaction]);
                $this->bump($brief, $previous, -1);
                $this->bump($brief, $reaction, 1);
            }

            $brief->refresh();
            Cache::forget(self::BRIEF_CACHE_PREFIX.$today);

            return $this->stateForBrief($brief, $voterKey);
        });
    }

    private function bump(SurfDailyBrief $brief, string $reaction, int $delta): void
    {
        $column = $reaction === SurfBriefVote::UP ? 'likes_count' : 'dislikes_count';
        $next = max(0, (int) $brief->{$column} + $delta);
        $brief->update([$column => $next]);
    }
}
