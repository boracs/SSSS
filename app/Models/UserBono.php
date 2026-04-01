<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class UserBono extends Model
{
    public const STATUS_PENDING = 'pending';
    public const STATUS_CONFIRMED = 'confirmed';
    public const STATUS_REJECTED = 'rejected';

    protected $table = 'user_bonos';

    protected $fillable = [
        'sku',
        'user_id',
        'pack_id',
        'clases_restantes',
        'debt_compensated_uc',
        'status',
        'payment_proof_path',
        'admin_notes',
    ];

    protected $casts = [
        'clases_restantes' => 'integer',
        'debt_compensated_uc' => 'integer',
    ];

    protected static function booted(): void
    {
        static::creating(function (UserBono $bono): void {
            if (! empty($bono->sku)) {
                return;
            }
            $bono->sku = self::generateUniqueSku();
        });
    }

    public static function generateUniqueSku(): string
    {
        do {
            $sku = 'CR-'.now()->format('Y').'-'.Str::upper(Str::random(6));
        } while (self::query()->where('sku', $sku)->exists());

        return $sku;
    }

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

