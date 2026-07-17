<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class PaymentReceipt extends Model
{
    protected $fillable = [
        'payable_type',
        'payable_id',
        'stripe_checkout_session_id',
        'stripe_payment_intent_id',
        'receipt_url',
        'storage_path',
        'captured_at',
    ];

    protected $casts = [
        'captured_at' => 'datetime',
    ];

    public function payable(): MorphTo
    {
        return $this->morphTo(__FUNCTION__, 'payable_type', 'payable_id');
    }

    /** @param Builder<PaymentReceipt> $query */
    public function scopeForPayable(Builder $query, string $payableType, int $payableId): Builder
    {
        return $query
            ->where('payable_type', $payableType)
            ->where('payable_id', $payableId);
    }

    public static function cacheKey(string $payableType, int $payableId): string
    {
        return $payableType.'#'.$payableId;
    }
}
