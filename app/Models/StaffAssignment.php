<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StaffAssignment extends Model
{
    public const ROLE_MONITOR = 'monitor';
    public const ROLE_FOTOGRAFO = 'fotografo';

    protected $fillable = [
        'lesson_id',
        'user_id',
        'role',
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
