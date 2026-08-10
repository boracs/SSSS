<?php

declare(strict_types=1);

namespace App\Models;

use App\Casts\BusinessWallClockDatetime;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class DatafonoPayment extends Model
{
    public const STATUS_PENDING_REVIEW = 'pending_review';

    public const STATUS_ASSIGNED = 'assigned';

    public const STATUS_IGNORED = 'ignored';

    public const SOURCE_TPV = 'tpv';

    public const SOURCE_MANUAL_CASH = 'manual_cash';

    protected $fillable = [
        'payment_terminal_id',
        'amount_cents',
        'paid_at',
        'external_reference',
        'status',
        'source',
        'assigned_user_id',
        'payable_type',
        'payable_id',
        'notes',
        'raw_payload',
        'created_by',
        'reviewed_by',
        'reviewed_at',
    ];

    protected $casts = [
        'amount_cents' => 'integer',
        'paid_at' => BusinessWallClockDatetime::class,
        'reviewed_at' => 'datetime',
        'raw_payload' => 'array',
    ];

    public function terminal(): BelongsTo
    {
        return $this->belongsTo(PaymentTerminal::class, 'payment_terminal_id');
    }

    public function assignedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_user_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function reviewedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function payable(): MorphTo
    {
        return $this->morphTo();
    }

    public function ticket(): HasOne
    {
        return $this->hasOne(MostradorTicket::class, 'datafono_payment_id');
    }
}
