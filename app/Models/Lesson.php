<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Lesson extends Model
{
    use HasFactory;

    public const LEVEL_INICIACION = 'iniciacion';
    public const LEVEL_PRO = 'pro';
    public const STATUS_SCHEDULED = 'scheduled';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_CANCELLED = 'cancelled';
    public const CANCELLATION_MAL_MAR = 'mal_mar';
    public const CANCELLATION_STUDENT = 'student';

    protected $fillable = [
        'title',
        'starts_at',
        'ends_at',
        'level',
        'max_slots',
        'location',
        'is_surf_trip',
        'is_optimal_waves',
        'status',
        'cancellation_reason',
        'surf_trip_triggered_at',
    ];

    protected $casts = [
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
        'is_surf_trip' => 'boolean',
        'is_optimal_waves' => 'boolean',
        'surf_trip_triggered_at' => 'datetime',
    ];

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'lesson_user')
            ->withPivot(['credits_locked', 'status', 'cancelled_at', 'surf_trip_confirmed'])
            ->withTimestamps();
    }

    public function enrollments(): HasMany
    {
        return $this->hasMany(LessonUser::class, 'lesson_id');
    }

    public function staffAssignments(): HasMany
    {
        return $this->hasMany(StaffAssignment::class, 'lesson_id');
    }

    public function creditTransactions(): HasMany
    {
        return $this->hasMany(CreditTransaction::class, 'lesson_id');
    }

    public function monitor(): ?User
    {
        $a = $this->staffAssignments()->where('role', 'monitor')->first();
        return $a?->user;
    }

    public function fotografo(): ?User
    {
        $a = $this->staffAssignments()->where('role', 'fotografo')->first();
        return $a?->user;
    }

    public function enrolledCount(): int
    {
        return $this->enrollments()->whereIn('status', ['enrolled', 'attended'])->count();
    }

    public function isSoloStudent(): bool
    {
        return $this->enrolledCount() === 1;
    }
}
