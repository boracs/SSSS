<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BonoConsumption extends Model
{
    protected $table = 'bono_consumptions';

    protected $fillable = [
        'user_bono_id',
        'user_id',
        'lesson_id',
        'remaining_after',
        'consumed_at',
    ];

    protected $casts = [
        'consumed_at' => 'datetime',
    ];

    public function userBono(): BelongsTo
    {
        return $this->belongsTo(UserBono::class, 'user_bono_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function lesson(): BelongsTo
    {
        return $this->belongsTo(Lesson::class);
    }
}

