<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PaymentWebhookIdempotency extends Model
{
    protected $table = 'payment_webhook_idempotency';

    protected $fillable = [
        'transaction_id',
        'idempotency_token',
        'checkout_url',
        'payable_type',
        'payable_id',
        'amount',
        'status',
        'expires_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'expires_at' => 'datetime',
    ];

    /**
     * URL de Checkout todavía utilizable para ese payable, o null.
     * Misma regla que PaymentGatewayService::openCheckoutUrlFor (F1/F2).
     */
    public static function liveCheckoutUrlFor(string $payableType, int $payableId): ?string
    {
        $intent = self::query()
            ->where('payable_type', $payableType)
            ->where('payable_id', $payableId)
            ->where('status', 'pending')
            ->whereNotNull('checkout_url')
            ->orderByDesc('id')
            ->first();

        if ($intent === null) {
            return null;
        }

        $expiresAt = $intent->expires_at ?? $intent->created_at?->addDay();
        if ($expiresAt !== null && $expiresAt->isPast()) {
            return null;
        }

        $url = trim((string) $intent->checkout_url);

        return $url !== '' ? $url : null;
    }
}
