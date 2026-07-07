<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmergencyKeyRequest extends Model
{
    protected $fillable = [
        'user_id',
        'requested_at',
        'resolved_code_shown',
        'admin_key_deactivated_at',
        'admin_key_deactivated_by',
        'admin_key_recovered_at',
        'admin_key_recovered_by',
    ];

    protected $casts = [
        'requested_at'             => 'datetime',
        'admin_key_deactivated_at' => 'datetime',
        'admin_key_recovered_at'   => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function deactivatedByAdmin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_key_deactivated_by');
    }

    public function recoveredByAdmin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_key_recovered_by');
    }

    public function isResolved(): bool
    {
        return $this->admin_key_deactivated_at !== null
            || $this->admin_key_recovered_at !== null;
    }

    /**
     * @return array<string, mixed>
     */
    public function toAdminArray(): array
    {
        $user = $this->user;

        return [
            'id'                       => $this->id,
            'user_id'                  => $this->user_id,
            'member_name'              => trim(($user?->nombre ?? '') . ' ' . ($user?->apellido ?? '')) ?: ($user?->email ?? '—'),
            'locker_number'            => $user?->numeroTaquilla,
            'requested_at'             => $this->requested_at?->toIso8601String(),
            'requested_at_label'       => $this->requested_at?->format('d/m/Y H:i'),
            'resolved_code_shown'      => $this->resolved_code_shown,
            'admin_key_deactivated_at' => $this->admin_key_deactivated_at?->toIso8601String(),
            'admin_key_recovered_at'   => $this->admin_key_recovered_at?->toIso8601String(),
            'is_key_deactivated'       => $this->admin_key_deactivated_at !== null,
            'is_key_recovered'         => $this->admin_key_recovered_at !== null,
            'is_resolved'              => $this->isResolved(),
        ];
    }
}
