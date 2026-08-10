<?php

declare(strict_types=1);

namespace App\Models;

use App\Casts\BusinessWallClockDatetime;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PhotoSessionBooking extends Model
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_CONFIRMED = 'confirmed';

    public const STATUS_ATTENDED = 'attended';

    public const STATUS_CANCELLED = 'cancelled';

    public const STATUS_REJECTED = 'rejected';

    public const PAYMENT_PENDING = 'pending';

    public const PAYMENT_CONFIRMED = 'confirmed';

    public const PAYMENT_REJECTED = 'rejected';

    protected $fillable = [
        'photo_session_id',
        'user_id',
        'guest_first_name',
        'guest_last_name',
        'guest_phone',
        'guest_email',
        'is_admin_guest',
        'fecha_inicio',
        'fecha_fin',
        'fecha_pago',
        'party_size',
        'precio_pagado_cents',
        'status',
        'payment_status',
        'payment_method',
        'payment_proof_path',
        'proof_uploaded_at',
        'reviewed_at',
        'admin_notes',
        'expires_at',
    ];

    protected $casts = [
        'fecha_inicio' => BusinessWallClockDatetime::class,
        'fecha_fin' => BusinessWallClockDatetime::class,
        'fecha_pago' => BusinessWallClockDatetime::class,
        'party_size' => 'integer',
        'precio_pagado_cents' => 'integer',
        'is_admin_guest' => 'boolean',
        'proof_uploaded_at' => 'datetime',
        'reviewed_at' => 'datetime',
        'expires_at' => 'datetime',
    ];

    public function isCheckoutExpired(): bool
    {
        return $this->expires_at !== null
            && $this->expires_at->isPast()
            && $this->payment_status === self::PAYMENT_PENDING
            && $this->status === self::STATUS_PENDING;
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(PhotoSession::class, 'photo_session_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function displayName(): string
    {
        $guest = trim((string) (($this->guest_first_name ?? '').' '.($this->guest_last_name ?? '')));
        if ($guest !== '') {
            return $guest;
        }

        $registered = trim((string) (($this->user?->nombre ?? '').' '.($this->user?->apellido ?? '')));
        if ($registered !== '') {
            return $registered;
        }

        return 'Anónimo';
    }

    public function isOwnedBy(User $user): bool
    {
        return $this->user_id !== null && (int) $this->user_id === (int) $user->id;
    }
}
