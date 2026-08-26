<?php

declare(strict_types=1);

namespace App\Services\Store;

use App\DTOs\Store\SecondHandCatalogFilters;
use App\DTOs\Store\SecondHandCatalogPageDto;
use App\Enums\SecondHandBoardType;
use App\Enums\SecondHandStatus;
use App\Models\SecondHandBoard;
use App\Services\Media\CatalogImageService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

final class SecondHandPublicCatalogService
{
    public function __construct(
        private readonly CatalogImageService $catalogImages,
    ) {}

    public function catalogPage(Request $request): SecondHandCatalogPageDto
    {
        $filters = SecondHandCatalogFilters::fromRequest($request);

        $base = SecondHandBoard::query()->whereIn(
            'status',
            SecondHandStatus::publicListingValues(),
        );

        $total = (clone $base)->count();

        $filteredQuery = $this->applyFilters(clone $base, $filters);
        $this->applySort($filteredQuery, $filters);

        $boards = $filteredQuery
            ->get()
            ->map(fn (SecondHandBoard $board) => $board->toPublicArray(includeGallery: false, images: $this->catalogImages))
            ->values()
            ->all();

        return new SecondHandCatalogPageDto(
            boards: $boards,
            filters: $filters->toFrontend(),
            filterOptions: [
                'height' => SecondHandCatalogFilters::heightOptions(),
                'volume' => SecondHandCatalogFilters::volumeOptions(),
                'price' => SecondHandCatalogFilters::priceOptions(),
                'type' => SecondHandCatalogFilters::typeOptions(),
            ],
            total: $total,
            matched: count($boards),
            filtersActive: $filters->isActive(),
        );
    }

    /**
     * Vecinas en el catálogo público (disponibles + reservadas), por id descendente.
     *
     * @return array{previous: array{id: int, name: string}|null, next: array{id: int, name: string}|null}
     */
    public function neighbors(SecondHandBoard $board): array
    {
        $currentId = (int) $board->id;

        $previous = SecondHandBoard::query()
            ->whereIn('status', SecondHandStatus::publicListingValues())
            ->where('id', '>', $currentId)
            ->orderBy('id')
            ->first(['id', 'name']);

        $next = SecondHandBoard::query()
            ->whereIn('status', SecondHandStatus::publicListingValues())
            ->where('id', '<', $currentId)
            ->orderByDesc('id')
            ->first(['id', 'name']);

        return [
            'previous' => $previous
                ? ['id' => (int) $previous->id, 'name' => (string) $previous->name]
                : null,
            'next' => $next
                ? ['id' => (int) $next->id, 'name' => (string) $next->name]
                : null,
        ];
    }

    public function assertPubliclyViewable(SecondHandBoard $board): void
    {
        if (! $board->status->isPubliclyListed()) {
            abort(404);
        }
    }

    /**
     * @param  Builder<SecondHandBoard>  $query
     * @return Builder<SecondHandBoard>
     */
    private function applyFilters(Builder $query, SecondHandCatalogFilters $filters): Builder
    {
        if ($filters->q !== '') {
            $term = '%'.$filters->q.'%';
            $query->where(function (Builder $sub) use ($term): void {
                $sub->where('name', 'like', $term)
                    ->orWhere('brand', 'like', $term)
                    ->orWhere('model', 'like', $term);
            });
        }

        match ($filters->height) {
            'short' => $query->where('height', '<=', 5.67),
            'mid-short' => $query->where('height', '>', 5.67)->where('height', '<=', 6.0),
            'mid-long' => $query->where('height', '>', 6.0)->where('height', '<=', 6.33),
            'long' => $query->where('height', '>', 6.33),
            default => null,
        };

        match ($filters->volume) {
            'low' => $query->where('volume', '<', 30),
            'mid-low' => $query->where('volume', '>=', 30)->where('volume', '<', 34),
            'mid' => $query->where('volume', '>=', 34)->where('volume', '<', 38),
            'high' => $query->where('volume', '>=', 38),
            default => null,
        };

        match ($filters->price) {
            'under300' => $query->whereRaw($this->effectivePriceSql().' <= 30000'),
            '300-450' => $query->whereRaw($this->effectivePriceSql().' > 30000')
                ->whereRaw($this->effectivePriceSql().' <= 45000'),
            '450-600' => $query->whereRaw($this->effectivePriceSql().' > 45000')
                ->whereRaw($this->effectivePriceSql().' <= 60000'),
            'over600' => $query->whereRaw($this->effectivePriceSql().' > 60000'),
            default => null,
        };

        $boardType = SecondHandBoardType::tryFrom($filters->type);
        if ($boardType !== null) {
            $query->where('board_type', $boardType->value);
        }

        return $query;
    }

    /**
     * @param  Builder<SecondHandBoard>  $query
     */
    private function applySort(Builder $query, SecondHandCatalogFilters $filters): void
    {
        if ($filters->sort === 'asc' || $filters->sort === 'desc') {
            $direction = $filters->sort === 'asc' ? 'asc' : 'desc';
            $query->orderByRaw($this->effectivePriceSql().' '.$direction)
                ->orderByDesc('id');

            return;
        }

        $query->orderByRaw("FIELD(status, 'available', 'reserved')")
            ->orderByDesc('id');
    }

    private function effectivePriceSql(): string
    {
        return 'ROUND(sale_price * (100 - COALESCE(discount_pct, 0)) / 100)';
    }
}
