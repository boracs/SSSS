<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CreditTransaction extends Model
{
    public const TYPE_PURCHASE = 'purchase';
    public const TYPE_LESSON_LOCK = 'lesson_lock';
    public const TYPE_LESSON_REFUND = 'lesson_refund';
    public const TYPE_LESSON_CHARGE = 'lesson_charge';
    public const TYPE_ADMIN_ADJUSTMENT = 'admin_adjustment';

    protected $fillable = [
        'user_id',
        'amount',
        'type',
        'lesson_id',
        'lesson_user_id',
        'description',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function lesson(): BelongsTo
    {
        return $this->belongsTo(Lesson::class);
    }

    public function lessonUser(): BelongsTo
    {
        return $this->belongsTo(LessonUser::class, 'lesson_user_id');
    }
}
