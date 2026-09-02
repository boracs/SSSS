<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\User;

class BookingPolicy
{
    /**
     * Ver reservas con su detalle interno (id y estado crudo de cada bloqueo).
     * El calendario público usa `BookingService::getPublicBlockedRanges`, que no expone nada de esto.
     */
    public function viewAny(User $user): bool
    {
        return (string) $user->role === 'admin';
    }
}
