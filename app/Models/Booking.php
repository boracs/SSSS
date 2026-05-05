<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Booking extends Model
{
    use HasFactory;

    public const STATUS_PENDING = 'pending';
    public const STATUS_CONFIRMED = 'confirmed';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_CANCELLED = 'cancelled';

    public const PAYMENT_PENDING = 'pending';
    public const PAYMENT_CONFIRMED = 'confirmed';
    public const PAYMENT_REJECTED = 'rejected';
    public const REFUND_PENDING = 'pending';
    public const REFUND_COMPLETED = 'completed';

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
        'payment_status',
        'payment_proof_path',
        'proof_uploaded_at',
        'reviewed_at',
        'refund_status',
        'payment_method',
        'admin_notes',
        'total_price',
        'deposit_amount',
        'payment_proof_note',
    ];

    protected $casts = [
        'start_date' => 'datetime',
        'end_date'   => 'datetime',
        'expires_at' => 'datetime',
        'proof_uploaded_at' => 'datetime',
        'reviewed_at' => 'datetime',
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

    public function attendanceNotes(): MorphMany
    {
        return $this->morphMany(AttendanceNote::class, 'reservation');
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

    /**
     * Hay ingreso o comprobante asociado: si el cliente cancela, el admin debe revisar devolución.
     */
    public function needsRefundReviewAfterCancellation(): bool
    {
        if ($this->payment_status === self::PAYMENT_CONFIRMED) {
            return true;
        }

        return ($this->payment_status ?? '') === self::PAYMENT_PENDING
            && ! empty($this->payment_proof_path);
    }

    /**
     * Marca la reserva cancelada y, si aplica, vuelve a dejarla sin revisar para que el badge rojo
     * del menú admin cuente la devolución pendiente (reviewed_at = null).
     */
    public function applyCancellationWithRefundQueue(): void
    {
        $needsQueue = $this->needsRefundReviewAfterCancellation();

        $this->status = self::STATUS_CANCELLED;
        if ($needsQueue) {
            $this->reviewed_at = null;
            $this->refund_status = self::REFUND_PENDING;
        } elseif ($this->refund_status !== null) {
            $this->refund_status = null;
        }
        $this->save();
    }
}
