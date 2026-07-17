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

    /**
     * Días de taquilla: periodo activo + planes confirmados ya pagados y encadenados.
     *
     * @param  Collection<int, int|string>|array<int, int|string>  $userIds
     * @return array<int, array{
     *     total_days_remaining: int|null,
     *     current_days_remaining: int|null,
     *     prepaid_extra_days: int,
     *     current_expires_at: string|null,
     *     final_expires_at: string|null
     * }>
     */
    public function computeAvailabilityMap(Collection|array $userIds): array
    {
        $ids = collect($userIds)->filter()->map(fn ($id) => (int) $id)->unique()->values();
        if ($ids->isEmpty()) {
            return [];
        }

        $today = Carbon::today()->startOfDay();

        $pagos = PagoCuota::query()
            ->whereIn('user_id', $ids)
            ->where('status', PagoCuota::STATUS_CONFIRMED)
            ->whereDate('periodo_fin', '>=', $today)
            ->orderBy('user_id')
            ->orderBy('periodo_inicio')
            ->get(['user_id', 'periodo_inicio', 'periodo_fin']);

        $byUser = $pagos->groupBy('user_id');
        $result = [];

        foreach ($ids as $userId) {
            $result[$userId] = $this->computeAvailabilityFromPagos($byUser->get($userId, collect()), $today);
        }

        return $result;
    }

    /**
     * @param  Collection<int, PagoCuota>  $confirmed
     * @return array{
     *     total_days_remaining: int|null,
     *     current_days_remaining: int|null,
     *     prepaid_extra_days: int,
     *     current_expires_at: string|null,
     *     final_expires_at: string|null
     * }
     */
    private function computeAvailabilityFromPagos(Collection $confirmed, Carbon $today): array
    {
        if ($confirmed->isEmpty()) {
            return [
                'total_days_remaining' => null,
                'current_days_remaining' => null,
                'prepaid_extra_days' => 0,
                'current_expires_at' => null,
                'final_expires_at' => null,
            ];
        }

        $finalEnd = $confirmed
            ->map(fn (PagoCuota $p) => Carbon::parse($p->periodo_fin)->startOfDay())
            ->max();

        $activeRow = $confirmed->first(function (PagoCuota $p) use ($today): bool {
            $start = Carbon::parse($p->periodo_inicio)->startOfDay();
            $end = Carbon::parse($p->periodo_fin)->startOfDay();

            return $start->lte($today) && $end->gte($today);
        });

        $currentDays = null;
        $prepaidExtra = 0;
        $currentExpiresAt = null;

        if ($activeRow) {
            $activeEnd = Carbon::parse($activeRow->periodo_fin)->startOfDay();
            $currentExpiresAt = $activeEnd->toDateString();
            $currentDays = (int) $today->diffInDays($activeEnd, false);

            $prepaidExtra = (int) $confirmed
                ->filter(fn (PagoCuota $p) => Carbon::parse($p->periodo_inicio)->startOfDay()->gt($activeEnd))
                ->sum(function (PagoCuota $p): int {
                    $start = Carbon::parse($p->periodo_inicio)->startOfDay();
                    $end = Carbon::parse($p->periodo_fin)->startOfDay();

                    return (int) ($start->diffInDays($end) + 1);
                });
        }

        $totalDays = (int) $today->diffInDays($finalEnd, false);

        return [
            'total_days_remaining' => $totalDays,
            'current_days_remaining' => $currentDays,
            'prepaid_extra_days' => $prepaidExtra,
            'current_expires_at' => $currentExpiresAt,
            'final_expires_at' => $finalEnd->toDateString(),
        ];
    }
}
