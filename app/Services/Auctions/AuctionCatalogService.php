<?php

declare(strict_types=1);

namespace App\Services\Auctions;

use App\Enums\AuctionStatus;
use App\Models\Auction;
use Illuminate\Support\Collection;

final class AuctionCatalogService
{
    /**
     * @return Collection<int, array<string, mixed>>
     */
    public function publicCatalog(?int $viewerUserId = null): Collection
    {
        return Auction::query()
            ->publicCatalog()
            ->get()
            ->map(fn (Auction $auction) => $auction->toPublicArray($viewerUserId));
    }

    /**
     * @return array<string, mixed>|null
     */
    public function publicShow(Auction $auction, ?int $viewerUserId = null): ?array
    {
        if (! $auction->status->isPubliclyVisible()) {
            return null;
        }

        $auction->load([
            'bids' => fn ($q) => $q->with('user:id,nombre,apellido')->limit(20),
        ]);

        return [
            ...$auction->toPublicArray($viewerUserId),
            'bids' => $auction->bids
                ->map(fn ($bid) => [
                    ...$bid->toPublicArray(),
                    'is_mine' => $viewerUserId !== null && (int) $bid->user_id === $viewerUserId,
                ])
                ->values()
                ->all(),
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return Collection<int, array<string, mixed>>
     */
    public function adminIndex(array $filters): Collection
    {
        return Auction::query()
            ->adminFilters($filters)
            ->with('winner:id,nombre,apellido,email')
            ->orderByRaw("FIELD(status, 'live', 'draft', 'ended', 'settled', 'cancelled')")
            ->orderByDesc('id')
            ->get()
            ->map(fn (Auction $auction) => [
                ...$auction->toPublicArray(),
                'winner_name' => $auction->winner
                    ? trim((string) $auction->winner->nombre.' '.(string) $auction->winner->apellido)
                    : null,
                'winner_email' => $auction->winner?->email,
                'created_at'   => $auction->created_at?->toDateString(),
            ]);
    }

    public function autoCloseExpiredLiveAuctions(): int
    {
        $expired = Auction::query()
            ->where('status', AuctionStatus::Live->value)
            ->whereNotNull('ends_at')
            ->where('ends_at', '<=', now())
            ->get();

        $closed = 0;

        foreach ($expired as $auction) {
            if (app(AuctionSettlementService::class)->closeAuction($auction)) {
                $closed++;
            }
        }

        return $closed;
    }
}
