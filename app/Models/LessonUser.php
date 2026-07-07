<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class LessonUser extends Model
{
    protected $table = 'lesson_user';

    public const STATUS_PENDING = 'pending';
    public const STATUS_CONFIRMED = 'confirmed';
    public const STATUS_ENROLLED = 'enrolled';
    public const STATUS_ATTENDED = 'attended';
    public const STATUS_CANCELLED = 'cancelled';
    public const STATUS_CANCELLED_FREE = 'cancelled_free';
    public const STATUS_CANCELLED_LATE_LOST = 'cancelled_late_lost';
    public const STATUS_CANCELLED_LATE_RESCUED = 'cancelled_late_rescued';
    public const STATUS_REFUNDED = 'refunded';
    public const STATUS_EXPIRED = 'expired';
    public const STATUS_PENDING_EXTRA_MONITOR = 'pending_extra_monitor';

    public const PAYMENT_PENDING = 'pending';
    public const PAYMENT_CONFIRMED = 'confirmed';
    public const PAYMENT_REJECTED = 'rejected';
    public const REFUND_PENDING = 'pending';
    public const REFUND_COMPLETED = 'completed';

    protected $fillable = [
        'lesson_id',
        'user_id',
        'guest_first_name',
        'guest_last_name',
        'guest_phone',
        'guest_email',
        'is_admin_guest',
        'party_size',
        'quantity',
        'age_bracket',
        'credits_locked',
        'status',
        'payment_status',
        'cancelled_at',
        'confirmed_at',
        'expires_at',
        'payment_proof_path',
        'proof_uploaded_at',
        'reviewed_at',
        'refund_status',
        'payment_method',
        'admin_notes',
        'surf_trip_confirmed',
    ];

    protected $casts = [
        'cancelled_at' => 'datetime',
        'confirmed_at' => 'datetime',
        'expires_at' => 'datetime',
        'proof_uploaded_at' => 'datetime',
        'reviewed_at' => 'datetime',
        'is_admin_guest' => 'boolean',
    ];

    public function lesson(): BelongsTo
    {
        return $this->belongsTo(Lesson::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function attendanceNotes(): MorphMany
    {
        return $this->morphMany(AttendanceNote::class, 'reservation');
    }

    public function isOwnedBy(User $user): bool
    {
        return $this->user_id !== null && (int) $this->user_id === (int) $user->id;
    }

    public function displayName(): string
    {
        $guest = trim((string) (($this->guest_first_name ?? '').' '.($this->guest_last_name ?? '')));
        if ($guest !== '') {
            return $guest;
        }

        return trim((string) (($this->user?->nombre ?? '').' '.($this->user?->apellido ?? '')));
    }

    /**
     * Estado operativo equivalente a "pending_payment": solicitud pendiente con pago aún no confirmado.
     */
    public function awaitingProofUpload(): bool
    {
        return in_array($this->status, [
            self::STATUS_PENDING,
            self::STATUS_PENDING_EXTRA_MONITOR,
        ], true) && $this->payment_status === self::PAYMENT_PENDING;
    }
}
