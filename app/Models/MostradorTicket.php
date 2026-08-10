<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MostradorTicket extends Model
{
    public const STATUS_CLOSED = 'closed';

    protected $fillable = [
        'datafono_payment_id',
        'user_id',
        'guest_name',
        'guest_email',
        'total_cents',
        'status',
    ];

    protected $casts = [
        'total_cents' => 'integer',
    ];

    public function payment(): BelongsTo
    {
        return $this->belongsTo(DatafonoPayment::class, 'datafono_payment_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function lines(): HasMany
    {
        return $this->hasMany(MostradorTicketLine::class, 'ticket_id')->orderBy('sort');
    }
}
