<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Enums\AuctionCategory;
use App\Enums\AuctionStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreAuctionRequest;
use App\Http\Requests\Admin\UpdateAuctionRequest;
use App\Models\Auction;
use App\Services\Auctions\AuctionCatalogService;
use App\Services\Auctions\AuctionSettlementService;
use App\Support\MoneyCents;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

class AuctionController extends Controller
{
    public function __construct(
        private readonly AuctionCatalogService $catalog,
        private readonly AuctionSettlementService $settlement,
    ) {}

    public function index(Request $request): Response
    {
        $this->catalog->autoCloseExpiredLiveAuctions();

        $filters = [
            'search'   => trim((string) $request->query('search', '')),
            'status'   => trim((string) $request->query('status', '')),
            'category' => trim((string) $request->query('category', '')),
        ];

        return Inertia::render('Admin/Auctions/Index', [
            'auctions'   => $this->catalog->adminIndex($filters)->values()->all(),
            'filters'    => $filters,
            'statuses'   => collect(AuctionStatus::cases())->map(fn ($s) => [
                'value' => $s->value,
                'label' => $s->label(),
            ]),
            'categories' => collect(AuctionCategory::cases())->map(fn ($c) => [
                'value' => $c->value,
                'label' => $c->label(),
            ]),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Admin/Auctions/Create', [
            'statuses'   => collect(AuctionStatus::cases())->map(fn ($s) => [
                'value' => $s->value,
                'label' => $s->label(),
            ]),
            'categories' => collect(AuctionCategory::cases())->map(fn ($c) => [
                'value' => $c->value,
                'label' => $c->label(),
            ]),
        ]);
    }

    public function store(StoreAuctionRequest $request): RedirectResponse
    {
        $data = $this->mapAuctionPayload($request->safe()->except('images', 'starting_price', 'min_increment', 'reserve_price'));
        $data['created_by'] = $request->user()?->id;
        $data['current_price_cents'] = $data['starting_price_cents'];

        if ($request->hasFile('images')) {
            $paths = [];
            foreach ($request->file('images') as $file) {
                $paths[] = $file->store('subastas', 'public');
            }
            $data['images'] = $paths;
        }

        Auction::query()->create($data);

        return redirect()->route('admin.auctions.index')
            ->with('success', 'Subasta creada correctamente.');
    }

    public function edit(Auction $auction): Response
    {
        return Inertia::render('Admin/Auctions/Edit', [
            'auction' => [
                ...$auction->toPublicArray(),
                'starting_price_eur'  => MoneyCents::centsToEuros($auction->starting_price_cents),
                'min_increment_eur'   => MoneyCents::centsToEuros($auction->min_increment_cents),
                'reserve_price_eur'   => $auction->reserve_price_cents !== null
                    ? MoneyCents::centsToEuros($auction->reserve_price_cents)
                    : null,
                'starts_at'           => $auction->starts_at?->format('Y-m-d\TH:i'),
                'ends_at'             => $auction->ends_at?->format('Y-m-d\TH:i'),
            ],
            'statuses'   => collect(AuctionStatus::cases())->map(fn ($s) => [
                'value' => $s->value,
                'label' => $s->label(),
            ]),
            'categories' => collect(AuctionCategory::cases())->map(fn ($c) => [
                'value' => $c->value,
                'label' => $c->label(),
            ]),
        ]);
    }

    public function update(UpdateAuctionRequest $request, Auction $auction): RedirectResponse
    {
        $data = $this->mapAuctionPayload($request->safe()->except('images', 'starting_price', 'min_increment', 'reserve_price'));

        if ($request->hasFile('images')) {
            foreach ($auction->images ?? [] as $oldPath) {
                Storage::disk('public')->delete($oldPath);
            }
            $paths = [];
            foreach ($request->file('images') as $file) {
                $paths[] = $file->store('subastas', 'public');
            }
            $data['images'] = $paths;
        }

        $auction->update($data);

        return redirect()->route('admin.auctions.index')
            ->with('success', 'Subasta actualizada.');
    }

    public function destroy(Auction $auction): RedirectResponse
    {
        foreach ($auction->images ?? [] as $path) {
            Storage::disk('public')->delete($path);
        }

        $auction->delete();

        return redirect()->route('admin.auctions.index')
            ->with('success', 'Subasta eliminada.');
    }

    public function publish(Auction $auction): RedirectResponse
    {
        try {
            $this->settlement->publish($auction);
        } catch (RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', 'Subasta publicada y en curso.');
    }

    public function close(Auction $auction): RedirectResponse
    {
        if (! $this->settlement->closeAuction($auction)) {
            return back()->with('error', 'No se pudo cerrar la subasta.');
        }

        return back()->with('success', 'Subasta cerrada.');
    }

    public function cancel(Auction $auction): RedirectResponse
    {
        try {
            $this->settlement->cancel($auction);
        } catch (RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', 'Subasta cancelada.');
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function mapAuctionPayload(array $data): array
    {
        $data['min_increment_cents'] = $data['min_increment_cents'] ?? 500;
        $data['reserve_price_cents'] = $data['reserve_price_cents'] ?? null;

        return $data;
    }
}
