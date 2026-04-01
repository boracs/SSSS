<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class AttendanceNote extends Model
{
    protected $fillable = [
        'user_id',
        'reservation_type',
        'reservation_id',
        'body',
        'is_visible_to_student',
        'admin_id',
    ];

    protected $casts = [
        'is_visible_to_student' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function admin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_id');
    }

    public function reservation(): MorphTo
    {
        return $this->morphTo(__FUNCTION__, 'reservation_type', 'reservation_id');
    }
}
