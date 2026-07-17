<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\AuctionBidStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuctionBid extends Model
{
    protected $fillable = [
        'auction_id',
        'user_id',
        'amount_cents',
        'status',
    ];

    protected $casts = [
        'status'       => AuctionBidStatus::class,
        'amount_cents' => 'integer',
    ];

    public function auction(): BelongsTo
    {
        return $this->belongsTo(Auction::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return array<string, mixed>
     */
    public function toPublicArray(): array
    {
        return [
            'id'           => $this->id,
            'amount_cents' => $this->amount_cents,
            'status'       => $this->status->value,
            'status_label' => $this->status->label(),
            'created_at'   => $this->created_at?->toIso8601String(),
            'bidder_name'  => $this->relationLoaded('user')
                ? trim((string) ($this->user?->nombre ?? '').' '.(string) ($this->user?->apellido ?? ''))
                : null,
        ];
    }
}
