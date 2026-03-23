<?php

namespace App\Services;

use App\Models\PackBono;
use App\Models\User;
use App\Models\UserBono;
use Illuminate\Http\UploadedFile;
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
        $userBono = UserBono::query()->findOrFail($userBonoId);
        $userBono->status = UserBono::STATUS_CONFIRMED;
        $userBono->admin_notes = trim((string) $userBono->admin_notes.' Confirmado por admin.');
        $userBono->save();

        return $userBono;
    }

    public function rejectBono(int $userBonoId, string $reason): UserBono
    {
        $userBono = UserBono::query()->findOrFail($userBonoId);
        $userBono->status = UserBono::STATUS_REJECTED;
        $userBono->admin_notes = trim($reason);
        $userBono->save();

        return $userBono;
    }
}

