<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Lesson extends Model
{
    use HasFactory;

    public const TYPE_SURF = 'surf';
    public const TYPE_SKATE = 'skate';

    public const LEVEL_INICIACION = 'iniciacion';
    public const LEVEL_PRO = 'pro';
    public const STATUS_SCHEDULED = 'scheduled';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_CANCELLED = 'cancelled';
    public const CANCELLATION_MAL_MAR = 'mal_mar';
    public const CANCELLATION_STUDENT = 'student';

    protected $fillable = [
        'title',
        'description',
        'starts_at',
        'ends_at',
        'type',
        'level',
        'max_slots',
        'max_capacity',
        'price',
        'currency',
        'location',
        'internal_notes',
        'is_private',
        'is_surf_trip',
        'is_optimal_waves',
        'status',
        'cancellation_reason',
        'surf_trip_triggered_at',
    ];

    protected $casts = [
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
        'is_private' => 'boolean',
        'is_surf_trip' => 'boolean',
        'is_optimal_waves' => 'boolean',
        'surf_trip_triggered_at' => 'datetime',
    ];

    public function totalPartySize(): int
    {
        return (int) $this->enrollments()
            ->whereIn('status', [
                LessonUser::STATUS_PENDING,
                LessonUser::STATUS_CONFIRMED,
                LessonUser::STATUS_ENROLLED,
                LessonUser::STATUS_ATTENDED,
            ])
            ->sum('party_size');
    }

    public function monitorsRequiredFor(int $totalPartySize, bool $hasBigGroup): int
    {
        $maxStaff = 2;
        if ($hasBigGroup) return $maxStaff;
        return (int) min($maxStaff, (int) ceil(max(0, $totalPartySize) / 6));
    }

    public function hasBigGroup(): bool
    {
        return $this->enrollments()
            ->whereIn('status', [
                LessonUser::STATUS_PENDING,
                LessonUser::STATUS_CONFIRMED,
                LessonUser::STATUS_ENROLLED,
                LessonUser::STATUS_ATTENDED,
            ])
            ->where('party_size', '>=', 7)
            ->exists();
    }

    public function isStaffFullFor(int $totalPartySize, bool $hasBigGroup): bool
    {
        return $this->monitorsRequiredFor($totalPartySize, $hasBigGroup) >= 2;
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'lesson_user')
            ->withPivot(['party_size', 'credits_locked', 'status', 'cancelled_at', 'confirmed_at', 'surf_trip_confirmed'])
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

    /** Número de inscripciones en estado PENDING (pendientes de validar pago). */
    public function getPendingCountAttribute(): int
    {
        return $this->enrollments()->where('status', LessonUser::STATUS_PENDING)->count();
    }

    /** Número de inscripciones confirmadas (confirmed + enrolled + attended). */
    public function getConfirmedCountAttribute(): int
    {
        return $this->enrollments()
            ->whereIn('status', [
                LessonUser::STATUS_CONFIRMED,
                LessonUser::STATUS_ENROLLED,
                LessonUser::STATUS_ATTENDED,
            ])
            ->count();
    }

    /** Total de alumnos activos (pendientes + confirmados). */
    public function getTotalStudentsAttribute(): int
    {
        return $this->pending_count + $this->confirmed_count;
    }

    public function isSoloStudent(): bool
    {
        return $this->enrolledCount() === 1;
    }
}
