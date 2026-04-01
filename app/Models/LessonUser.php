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
    public const PAYMENT_SUBMITTED = 'submitted';
    public const PAYMENT_CONFIRMED = 'confirmed';

    protected $fillable = [
        'lesson_id',
        'user_id',
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
        'payment_method',
        'admin_notes',
        'surf_trip_confirmed',
    ];

    protected $casts = [
        'cancelled_at' => 'datetime',
        'confirmed_at' => 'datetime',
        'expires_at' => 'datetime',
        'proof_uploaded_at' => 'datetime',
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
}
