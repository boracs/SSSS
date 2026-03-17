<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Booking extends Model
{
    use HasFactory;

    public const STATUS_PENDING = 'pending';
    public const STATUS_CONFIRMED = 'confirmed';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
        'surfboard_id',
        'user_id',
        'client_name',
        'client_email',
        'client_phone',
        'start_date',
        'end_date',
        'expires_at',
        'status',
        'total_price',
        'deposit_amount',
        'payment_proof_note',
    ];

    protected $casts = [
        'start_date' => 'datetime',
        'end_date'   => 'datetime',
        'expires_at' => 'datetime',
        'total_price' => 'decimal:2',
        'deposit_amount' => 'decimal:2',
    ];

    public function surfboard(): BelongsTo
    {
        return $this->belongsTo(Surfboard::class, 'surfboard_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Reservas que bloquean la tabla (no canceladas).
     */
    public function scopeBlocking(Builder $query): Builder
    {
        return $query->whereIn('status', [self::STATUS_PENDING, self::STATUS_CONFIRMED, self::STATUS_COMPLETED]);
    }

    /**
     * Reservas pendientes que han superado el plazo de expiración (ej. 7 días).
     */
    public function scopeExpiredPending(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_PENDING)
            ->where(function (Builder $q) {
                $q->whereNotNull('expires_at')->where('expires_at', '<', now());
            });
    }
}
