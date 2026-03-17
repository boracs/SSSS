<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LessonUser extends Model
{
    protected $table = 'lesson_user';

    public const STATUS_ENROLLED = 'enrolled';
    public const STATUS_ATTENDED = 'attended';
    public const STATUS_CANCELLED = 'cancelled';
    public const STATUS_REFUNDED = 'refunded';

    protected $fillable = [
        'lesson_id',
        'user_id',
        'credits_locked',
        'status',
        'cancelled_at',
        'surf_trip_confirmed',
    ];

    protected $casts = [
        'cancelled_at' => 'datetime',
    ];

    public function lesson(): BelongsTo
    {
        return $this->belongsTo(Lesson::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
