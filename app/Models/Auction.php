<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\AuctionCategory;
use App\Enums\AuctionStatus;
use App\Enums\PaymentStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Auction extends Model
{
    protected $fillable = [
        'title',
        'slug',
        'description',
        'category',
        'images',
        'starting_price_cents',
        'current_price_cents',
        'min_increment_cents',
        'reserve_price_cents',
        'bid_count',
        'status',
        'payment_status',
        'winner_user_id',
        'created_by',
        'starts_at',
        'ends_at',
        'settled_at',
    ];

    protected $casts = [
        'status'               => AuctionStatus::class,
        'category'             => AuctionCategory::class,
        'payment_status'       => PaymentStatus::class,
        'images'               => 'array',
        'starting_price_cents' => 'integer',
        'current_price_cents'  => 'integer',
        'min_increment_cents'  => 'integer',
        'reserve_price_cents'  => 'integer',
        'bid_count'            => 'integer',
        'starts_at'            => 'datetime',
        'ends_at'              => 'datetime',
        'settled_at'           => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (Auction $auction): void {
            if ($auction->slug === null || $auction->slug === '') {
                $auction->slug = static::uniqueSlug((string) $auction->title);
            }

            if ($auction->current_price_cents === null) {
                $auction->current_price_cents = $auction->starting_price_cents;
            }
        });
    }

    public function bids(): HasMany
    {
        return $this->hasMany(AuctionBid::class)->orderByDesc('amount_cents');
    }

    public function winner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'winner_user_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function scopeLive(Builder $query): Builder
    {
        return $query->where('status', AuctionStatus::Live->value);
    }

    public function scopePublicCatalog(Builder $query): Builder
    {
        return $query
            ->whereIn('status', [
                AuctionStatus::Live->value,
                AuctionStatus::Ended->value,
                AuctionStatus::Settled->value,
            ])
            ->orderByRaw("FIELD(status, 'live', 'ended', 'settled')")
            ->orderByDesc('ends_at');
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    public function scopeAdminFilters(Builder $query, array $filters): Builder
    {
        $search = trim((string) ($filters['search'] ?? ''));
        $status = trim((string) ($filters['status'] ?? ''));
        $category = trim((string) ($filters['category'] ?? ''));

        return $query
            ->when($search !== '', function (Builder $q) use ($search): void {
                $term = '%'.$search.'%';
                $q->where(function (Builder $sub) use ($term): void {
                    $sub->where('title', 'like', $term)
                        ->orWhere('description', 'like', $term);
                });
            })
            ->when(
                $status !== '' && AuctionStatus::tryFrom($status) !== null,
                fn (Builder $q) => $q->where('status', $status),
            )
            ->when(
                $category !== '' && AuctionCategory::tryFrom($category) !== null,
                fn (Builder $q) => $q->where('category', $category),
            );
    }

    public function isLiveNow(): bool
    {
        if ($this->status !== AuctionStatus::Live) {
            return false;
        }

        $now = now();

        if ($this->starts_at !== null && $this->starts_at->isFuture()) {
            return false;
        }

        if ($this->ends_at !== null && $this->ends_at->isPast()) {
            return false;
        }

        return true;
    }

    public function hasEndedByTime(): bool
    {
        return $this->ends_at !== null && $this->ends_at->isPast();
    }

    public function minimumNextBidCents(): int
    {
        if ($this->bid_count === 0) {
            return $this->starting_price_cents;
        }

        return $this->current_price_cents + $this->min_increment_cents;
    }

    public function reserveMet(): bool
    {
        if ($this->reserve_price_cents === null) {
            return true;
        }

        return $this->current_price_cents >= $this->reserve_price_cents;
    }

    public function firstImage(): ?string
    {
        $images = $this->images ?? [];

        return $images[0] ?? null;
    }

    /**
     * @return array<string, mixed>
     */
    public function toPublicArray(?int $viewerUserId = null): array
    {
        $winningBid = $this->relationLoaded('bids')
            ? $this->bids->firstWhere('status', \App\Enums\AuctionBidStatus::Winning->value)
            : null;

        return [
            'id'                    => $this->id,
            'title'                 => $this->title,
            'slug'                  => $this->slug,
            'description'           => $this->description,
            'category'              => $this->category?->value,
            'category_label'        => $this->category?->label(),
            'starting_price_cents'  => $this->starting_price_cents,
            'current_price_cents'   => $this->current_price_cents,
            'min_increment_cents'   => $this->min_increment_cents,
            'bid_count'             => $this->bid_count,
            'status'                => $this->status->value,
            'status_label'          => $this->status->label(),
            'payment_status'        => $this->payment_status?->value,
            'is_live'               => $this->isLiveNow(),
            'has_ended'             => $this->status === AuctionStatus::Ended
                || $this->status === AuctionStatus::Settled
                || ($this->status === AuctionStatus::Live && $this->hasEndedByTime()),
            'starts_at'             => $this->starts_at?->toIso8601String(),
            'ends_at'               => $this->ends_at?->toIso8601String(),
            'minimum_next_bid_cents'=> $this->minimumNextBidCents(),
            'reserve_met'           => $this->reserveMet(),
            'winner_user_id'        => $this->winner_user_id,
            'is_winner'             => $viewerUserId !== null && (int) $this->winner_user_id === $viewerUserId,
            'can_pay'               => $viewerUserId !== null
                && (int) $this->winner_user_id === $viewerUserId
                && $this->status === AuctionStatus::Ended
                && $this->payment_status === PaymentStatus::Pending,
            'images'                => array_map(
                fn (string $p) => self::publicImageUrl($p),
                $this->images ?? [],
            ),
            'first_image'           => $this->firstImage()
                ? self::publicImageUrl($this->firstImage())
                : null,
            'leading_bid_cents'     => $winningBid?->amount_cents,
        ];
    }

    public static function publicImageUrl(string $path): string
    {
        $path = ltrim($path, '/');

        if (str_starts_with($path, 'img/') || str_starts_with($path, 'images/')) {
            return asset($path);
        }

        return asset('storage/'.$path);
    }

    public static function uniqueSlug(string $title): string
    {
        $base = Str::slug($title);
        if ($base === '') {
            $base = 'subasta';
        }

        $slug = $base;
        $i = 1;

        while (static::query()->where('slug', $slug)->exists()) {
            $slug = $base.'-'.$i;
            $i++;
        }

        return $slug;
    }
}
