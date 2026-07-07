<?php

namespace App\Services;

use App\Models\PackBono;
use App\Models\User;
use App\Models\UserBono;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class BonoService
{
    public function requestBono(User $user, PackBono $pack, UploadedFile $proofFile): UserBono
    {
        $path = $proofFile->store('comprobantes_bonos', 'public');

        return DB::transaction(function () use ($user, $pack, $path) {
            return UserBono::create([
                'user_id' => $user->id,
                'pack_id' => $pack->id,
                'clases_restantes' => (int) $pack->num_clases,
                'status' => UserBono::STATUS_PENDING,
                'payment_proof_path' => $path,
            ]);
        });
    }

    public function confirmBono(int $userBonoId): UserBono
    {
        return DB::transaction(function () use ($userBonoId) {
            $userBono = UserBono::query()
                ->with('pack:id,num_clases')
                ->lockForUpdate()
                ->findOrFail($userBonoId);

            if ($userBono->status === UserBono::STATUS_CONFIRMED) {
                return $userBono;
            }

            $packSize = (int) ($userBono->pack?->num_clases ?? 0);

            $userBono->status = UserBono::STATUS_CONFIRMED;
            $userBono->debt_compensated_uc = 0;
            $userBono->clases_restantes = $packSize;
            $userBono->admin_notes = trim((string) $userBono->admin_notes.' Confirmado por admin.');
            $userBono->save();

            return $userBono;
        });
    }

    public function rejectBono(int $userBonoId, string $reason): UserBono
    {
        $userBono = UserBono::query()->findOrFail($userBonoId);
        $userBono->status = UserBono::STATUS_REJECTED;
        $userBono->admin_notes = trim($reason);
        $userBono->save();

        return $userBono;
    }

    /**
     * Estado de consumo visible al alumno (FIFO: el bono confirmado más antiguo con saldo es el activo).
     *
     * @param  iterable<UserBono>  $bonos
     * @return array<int, array{usage_status: string, usage_label: string}>
     */
    public function resolveUsageStates(iterable $bonos): array
    {
        $collection = $bonos instanceof Collection ? $bonos : collect($bonos);

        $confirmedAsc = $collection
            ->filter(fn (UserBono $b) => $b->status === UserBono::STATUS_CONFIRMED)
            ->sortBy(fn (UserBono $b) => sprintf(
                '%s-%010d',
                (string) ($b->created_at?->format('YmdHisu') ?? '00000000000000000000'),
                (int) $b->id
            ))
            ->values();

        $activeBonoId = $this->resolveActiveBonoId($confirmedAsc);

        $states = [];
        foreach ($collection as $bono) {
            $states[(int) $bono->id] = $this->resolveSingleUsageState($bono, $activeBonoId);
        }

        return $states;
    }

    /**
     * Un solo bono activo: primero el más antiguo ya empezado; si ninguno, el más antiguo con saldo.
     */
    private function resolveActiveBonoId(Collection $confirmedAsc): ?int
    {
        $partiallyUsed = $confirmedAsc->first(function (UserBono $b) {
            $remaining = (int) $b->clases_restantes;
            $packSize = (int) ($b->pack?->num_clases ?? 0);

            return $remaining > 0 && $packSize > 0 && $remaining < $packSize;
        });

        if ($partiallyUsed !== null) {
            return (int) $partiallyUsed->id;
        }

        return $confirmedAsc
            ->first(fn (UserBono $b) => (int) $b->clases_restantes > 0)
            ?->id;
    }

    /**
     * @return array{usage_status: string, usage_label: string}
     */
    private function resolveSingleUsageState(UserBono $bono, ?int $activeBonoId): array
    {
        return match ($bono->status) {
            UserBono::STATUS_PENDING => [
                'usage_status' => 'pending_validation',
                'usage_label' => 'Pendiente de validación',
            ],
            UserBono::STATUS_REJECTED => [
                'usage_status' => 'rejected',
                'usage_label' => 'Rechazado',
            ],
            default => $this->resolveConfirmedUsageState($bono, $activeBonoId),
        };
    }

    /**
     * @return array{usage_status: string, usage_label: string}
     */
    private function resolveConfirmedUsageState(UserBono $bono, ?int $activeBonoId): array
    {
        $remaining = (int) $bono->clases_restantes;
        $packSize = (int) ($bono->pack?->num_clases ?? 0);

        if ($remaining <= 0) {
            return ['usage_status' => 'consumed', 'usage_label' => 'Consumido'];
        }

        if ($activeBonoId !== null && (int) $bono->id === (int) $activeBonoId) {
            return ['usage_status' => 'in_use', 'usage_label' => 'En uso'];
        }

        return ['usage_status' => 'queued', 'usage_label' => 'En cola'];
    }

    /**
     * Resumen de cartera VIP desde clases_restantes (misma fuente que el enrolamiento).
     *
     * @param  iterable<UserBono>  $bonos
     * @return array{
     *     total_purchased_uc: int,
     *     total_consumed_uc: int,
     *     total_available_uc: int,
     *     queue_available_uc: int,
     *     queued_bonos_count: int,
     *     queued_bonos: list<array{id: int, name: string, sku: ?string, pack_total_uc: int, remaining_uc: int}>,
     *     active_bono_id: ?int,
     *     consuming_bono: ?array{id: int, name: string, sku: ?string, pack_total_uc: int, consumed_uc: int, remaining_uc: int},
     *     latest_purchase: ?array{id: int, name: string, sku: ?string, pack_total_uc: int, remaining_uc: int}
     * }
     */
    public function buildWalletSnapshot(iterable $bonos): array
    {
        $collection = $bonos instanceof Collection ? $bonos : collect($bonos);

        $confirmedAsc = $collection
            ->filter(fn (UserBono $b) => $b->status === UserBono::STATUS_CONFIRMED)
            ->sortBy(fn (UserBono $b) => sprintf(
                '%s-%010d',
                (string) ($b->created_at?->format('YmdHisu') ?? '00000000000000000000'),
                (int) $b->id
            ))
            ->values();

        $confirmedDesc = $confirmedAsc
            ->sortByDesc(fn (UserBono $b) => sprintf(
                '%s-%010d',
                (string) ($b->created_at?->format('YmdHisu') ?? '00000000000000000000'),
                (int) $b->id
            ))
            ->values();

        $activeBonoId = $this->resolveActiveBonoId($confirmedAsc);

        $totalPurchasedUc = 0;
        $totalAvailableUc = 0;
        $queueAvailableUc = 0;
        $queuedBonosCount = 0;
        $queuedBonos = [];
        $consumingBono = null;

        foreach ($confirmedAsc as $bono) {
            $packTotalUc = (int) ($bono->pack?->num_clases ?? 0);
            $remainingUc = max(0, (int) $bono->clases_restantes);
            $totalPurchasedUc += $packTotalUc;
            $totalAvailableUc += $remainingUc;

            if ($activeBonoId !== null && (int) $bono->id === (int) $activeBonoId) {
                $consumingBono = [
                    'id' => (int) $bono->id,
                    'name' => (string) ($bono->pack?->nombre ?: 'Bono VIP'),
                    'sku' => $bono->sku,
                    'pack_total_uc' => $packTotalUc,
                    'remaining_uc' => $remainingUc,
                    'consumed_uc' => max(0, $packTotalUc - $remainingUc),
                ];

                continue;
            }

            if ($remainingUc > 0) {
                $queueAvailableUc += $remainingUc;
                $queuedBonosCount++;
                $queuedBonos[] = [
                    'id' => (int) $bono->id,
                    'name' => (string) ($bono->pack?->nombre ?: 'Bono VIP'),
                    'sku' => $bono->sku,
                    'pack_total_uc' => $packTotalUc,
                    'remaining_uc' => $remainingUc,
                ];
            }
        }

        $latest = $confirmedDesc->first();
        $latestPurchase = $latest ? [
            'id' => (int) $latest->id,
            'name' => (string) ($latest->pack?->nombre ?: 'Bono VIP'),
            'sku' => $latest->sku,
            'pack_total_uc' => (int) ($latest->pack?->num_clases ?? 0),
            'remaining_uc' => max(0, (int) $latest->clases_restantes),
        ] : null;

        return [
            'total_purchased_uc' => $totalPurchasedUc,
            'total_consumed_uc' => max(0, $totalPurchasedUc - $totalAvailableUc),
            'total_available_uc' => $totalAvailableUc,
            'queue_available_uc' => $queueAvailableUc,
            'queued_bonos_count' => $queuedBonosCount,
            'queued_bonos' => $queuedBonos,
            'active_bono_id' => $activeBonoId,
            'consuming_bono' => $consumingBono,
            'latest_purchase' => $latestPurchase,
        ];
    }
}

