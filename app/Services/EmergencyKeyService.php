<?php

declare(strict_types=1);

namespace App\Services;

use App\DTOs\EmergencyKey\EmergencyKeyRevealDto;
use App\DTOs\EmergencyKey\EmergencyLockStatusDto;
use App\Exceptions\EmergencyKeyNotEligibleException;
use App\Models\EmergencyKeyRequest;
use App\Models\EmergencyLockSetting;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class EmergencyKeyService
{
    public function canRequest(User $user): bool
    {
        return $user->hasPhysicalLocker()
            && $user->isLockerPaymentUpToDate();
    }

    public function statusFor(User $user): EmergencyLockStatusDto
    {
        $settings = EmergencyLockSetting::singleton();

        return new EmergencyLockStatusDto(
            isActive: (bool) $settings->is_active,
            canRequest: $this->canRequest($user) && $settings->is_active,
        );
    }

    public function requestCode(User $user): EmergencyKeyRevealDto
    {
        if (! $this->canRequest($user)) {
            throw EmergencyKeyNotEligibleException::notSocio();
        }

        return DB::transaction(function () use ($user): EmergencyKeyRevealDto {
            $settings = EmergencyLockSetting::query()
                ->orderBy('id')
                ->lockForUpdate()
                ->firstOrFail();

            if (! $settings->is_active) {
                throw EmergencyKeyNotEligibleException::lockInactive();
            }

            $code = (string) $settings->current_code;
            $requestedAt = Carbon::now();

            EmergencyKeyRequest::query()->create([
                'user_id'             => $user->id,
                'requested_at'        => $requestedAt,
                'resolved_code_shown' => $code,
            ]);

            $settings->update(['is_active' => false]);

            return new EmergencyKeyRevealDto(
                code: $code,
                requestedAt: $requestedAt->toIso8601String(),
            );
        });
    }

    public function updateLockCode(string $code): void
    {
        DB::transaction(function () use ($code): void {
            $settings = EmergencyLockSetting::query()
                ->orderBy('id')
                ->lockForUpdate()
                ->firstOrFail();

            $settings->update([
                'current_code' => $code,
                'is_active'    => true,
            ]);
        });
    }

    public function markKeyDeactivated(EmergencyKeyRequest $request, User $admin): void
    {
        if ($request->isResolved()) {
            return;
        }

        $request->update([
            'admin_key_deactivated_at' => Carbon::now(),
            'admin_key_deactivated_by' => $admin->id,
        ]);
    }

    public function markKeyRecovered(EmergencyKeyRequest $request, User $admin): void
    {
        if ($request->isResolved()) {
            return;
        }

        $request->update([
            'admin_key_recovered_at' => Carbon::now(),
            'admin_key_recovered_by' => $admin->id,
        ]);
    }

    public function resolveKeyRequest(EmergencyKeyRequest $request, User $admin, string $outcome): void
    {
        if ($outcome === 'lost_definitive') {
            $this->markKeyDeactivated($request, $admin);

            return;
        }

        $this->markKeyRecovered($request, $admin);
    }
}
