<?php

declare(strict_types=1);

namespace App\Services\Vip;

use App\Models\User;
use App\Support\VipVirtualLocker;
use Illuminate\Support\Facades\DB;

final class VipMembershipService
{
    public function activate(User $user): User
    {
        return DB::transaction(function () use ($user): User {
            $locked = User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();
            $locked->is_vip = true;
            $this->ensureSharedLockerIfMissing($locked);
            $locked->save();

            return $locked->fresh();
        });
    }

    public function deactivate(User $user): User
    {
        return DB::transaction(function () use ($user): User {
            $locked = User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();
            $locked->is_vip = false;
            $this->releaseSharedLockerOnly($locked);
            $locked->save();

            return $locked->fresh();
        });
    }

    public function toggle(User $user): User
    {
        return (bool) $user->is_vip
            ? $this->deactivate($user)
            : $this->activate($user);
    }

    /**
     * VIP sin ningún número asignado recibe #500.
     * Si ya tiene casillero (físico o virtual), no se sobrescribe.
     */
    public function ensureSharedLockerIfMissing(User $user): void
    {
        if ($this->hasAssignedLockerNumber($user->numeroTaquilla)) {
            return;
        }

        $user->numeroTaquilla = VipVirtualLocker::defaultNumber();
    }

    private function hasAssignedLockerNumber(mixed $numero): bool
    {
        return $numero !== null && $numero !== '' && $numero !== '0' && $numero !== 0;
    }

    /**
     * Al quitar VIP, libera solo la taquilla virtual. La física se mantiene.
     */
    public function releaseSharedLockerOnly(User $user): void
    {
        if ($user->hasSharedLocker()) {
            $user->numeroTaquilla = null;
        }
    }

    /**
     * Repara VIPs existentes que se quedaron sin número de taquilla.
     */
    public function backfillSharedLockersForVips(): int
    {
        return (int) DB::transaction(function (): int {
            $updated = 0;

            $vips = User::query()
                ->where('is_vip', true)
                ->lockForUpdate()
                ->get();

            foreach ($vips as $vip) {
                if ($this->hasAssignedLockerNumber($vip->numeroTaquilla)) {
                    continue;
                }

                $this->ensureSharedLockerIfMissing($vip);
                $vip->save();
                $updated++;
            }

            return $updated;
        });
    }
}
