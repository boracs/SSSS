<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class MostradorTicketLine extends Model
{
    protected $fillable = [
        'ticket_id',
        'category',
        'amount_cents',
        'payable_type',
        'payable_id',
        'payload',
        'sort',
    ];

    protected $casts = [
        'amount_cents' => 'integer',
        'sort' => 'integer',
        'payload' => 'array',
    ];

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(MostradorTicket::class, 'ticket_id');
    }

    public function payable(): MorphTo
    {
        return $this->morphTo();
    }
}
