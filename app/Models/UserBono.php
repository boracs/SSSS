<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class UserBono extends Model
{
    public const STATUS_PENDING = 'pending';
    public const STATUS_CONFIRMED = 'confirmed';
    public const STATUS_REJECTED = 'rejected';

    protected $table = 'user_bonos';

    protected $fillable = [
        'user_id',
        'pack_id',
        'clases_restantes',
        'status',
        'payment_proof_path',
        'admin_notes',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function pack(): BelongsTo
    {
        return $this->belongsTo(PackBono::class, 'pack_id');
    }

    public function consumptions(): HasMany
    {
        return $this->hasMany(BonoConsumption::class, 'user_bono_id');
    }
}

