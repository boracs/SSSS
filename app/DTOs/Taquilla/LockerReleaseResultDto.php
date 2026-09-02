<?php

declare(strict_types=1);

namespace App\DTOs\Taquilla;

use App\Models\User;

/**
 * Resultado de liberar una taquilla: hace falta saber si además se retiró el VIP
 * para elegir el mensaje, sin devolver arrays entre capas.
 */
final readonly class LockerReleaseResultDto
{
    public function __construct(
        public User $user,
        public bool $vipRemoved,
    ) {}
}
