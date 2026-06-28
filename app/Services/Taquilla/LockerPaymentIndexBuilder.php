<?php

declare(strict_types=1);

namespace App\Services\Taquilla;

use App\Models\PagoCuota;
use Carbon\Carbon;
use Illuminate\Support\Collection;

final class LockerPaymentIndexBuilder
{
    /**
     * @param  Collection<int, int|string>|array<int, int|string>  $userIds
     * @return array{valid: array<int, int>, latest_start: array<int, Carbon>}
     */
    public function build(Collection|array $userIds): array
    {
        $ids = collect($userIds)->filter()->unique()->values();

        if ($ids->isEmpty()) {
            return ['valid' => [], 'latest_start' => []];
        }

        $today = Carbon::today();

        $valid = PagoCuota::query()
            ->whereIn('user_id', $ids)
            ->where('status', PagoCuota::STATUS_CONFIRMED)
            ->whereDate('periodo_fin', '>=', $today)
            ->pluck('user_id')
            ->unique()
            ->flip()
            ->all();

        $latestStart = PagoCuota::query()
            ->selectRaw('user_id, MAX(periodo_inicio) as periodo_inicio')
            ->whereIn('user_id', $ids)
            ->where('status', PagoCuota::STATUS_CONFIRMED)
            ->groupBy('user_id')
            ->get()
            ->mapWithKeys(function ($row): array {
                return [(int) $row->user_id => Carbon::parse($row->periodo_inicio)->startOfDay()];
            })
            ->all();

        return ['valid' => $valid, 'latest_start' => $latestStart];
    }

    /**
     * @param  array{valid: array<int, int>, latest_start: array<int, Carbon>}  $index
     */
    public function isLockerUpToDate(\App\Models\User $user, array $index): bool
    {
        if (empty($user->numeroTaquilla) || empty($user->fecha_vencimiento_cuota)) {
            return false;
        }

        if (! isset($index['valid'][$user->id])) {
            return false;
        }

        $expiresAt = $user->fecha_vencimiento_cuota instanceof Carbon
            ? $user->fecha_vencimiento_cuota->copy()
            : Carbon::parse((string) $user->fecha_vencimiento_cuota);

        return $expiresAt->isSameDay(Carbon::today()) || $expiresAt->isFuture();
    }

    /**
     * @param  array{valid: array<int, int>, latest_start: array<int, Carbon>}  $index
     */
    public function resolvePlanStatus(\App\Models\User $user, array $index): string
    {
        if (empty($user->numeroTaquilla)) {
            return 'no_locker';
        }

        return $this->isLockerUpToDate(user: $user, index: $index) ? 'up_to_date' : 'outdated';
    }

    /**
     * @param  array{valid: array<int, int>, latest_start: array<int, Carbon>}  $index
     * @return array<string, mixed>
     */
    public function mapLockerUserRow(\App\Models\User $user, array $index): array
    {
        $today = now()->startOfDay();
        $start = $index['latest_start'][$user->id] ?? null;
        $end = $user->fecha_vencimiento_cuota ? Carbon::parse($user->fecha_vencimiento_cuota)->startOfDay() : null;
        $progress = 0;
        $daysRemaining = null;
        $isExpired = false;

        if ($start && $end && $end->gte($start)) {
            $total = max(1, $start->diffInDays($end));
            $daysRemaining = $today->diffInDays($end, false);
            $isExpired = $daysRemaining < 0;
            $magnitude = abs((int) $daysRemaining);
            $progress = (int) round((min($total, $magnitude) * 100) / $total);
        }

        return [
            'id' => $user->id,
            'name' => trim(($user->nombre ?? '').' '.($user->apellido ?? '')),
            'email' => $user->email,
            'phone' => $user->telefono,
            'locker' => $user->numeroTaquilla,
            'expires_at' => optional($user->fecha_vencimiento_cuota)->toDateString(),
            'up_to_date' => $this->isLockerUpToDate(user: $user, index: $index),
            'progress' => $progress,
            'days_remaining' => $daysRemaining,
            'is_expired' => $isExpired,
        ];
    }
}
