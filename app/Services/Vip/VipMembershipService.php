<?php

declare(strict_types=1);

namespace App\Services\Vip;

use App\Models\User;
use Illuminate\Support\Facades\DB;

final class VipMembershipService
{
    public function activate(User $user): User
    {
        return DB::transaction(function () use ($user): User {
            $locked = User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();
            $locked->is_vip = true;
            $locked->save();

            return $locked->fresh();
        });
    }

    public function deactivate(User $user): User
    {
        return DB::transaction(function () use ($user): User {
            $locked = User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();
            $locked->is_vip = false;
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
}
