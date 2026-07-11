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
        'payable_type',
        'payable_id',
        'amount',
        'status',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
    ];
}
