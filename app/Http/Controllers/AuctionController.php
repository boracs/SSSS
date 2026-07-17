<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Actions\Auctions\PlaceBidAction;
use App\DTOs\Auctions\PlaceBidDto;
use App\Http\Requests\Auctions\PlaceBidRequest;
use App\Models\Auction;
use App\Services\Auctions\AuctionCatalogService;
use App\Services\Auctions\AuctionSettlementService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

class AuctionController extends Controller
{
    public function __construct(
        private readonly AuctionCatalogService $catalog,
        private readonly PlaceBidAction $placeBid,
        private readonly AuctionSettlementService $settlement,
    ) {}

    public function index(Request $request): Response
    {
        $this->catalog->autoCloseExpiredLiveAuctions();

        return Inertia::render('Auctions/Index', [
            'auctions' => $this->catalog->publicCatalog($request->user()?->id)->values()->all(),
        ]);
    }

    public function show(Request $request, Auction $auction): Response|RedirectResponse
    {
        $this->catalog->autoCloseExpiredLiveAuctions();

        $payload = $this->catalog->publicShow($auction, $request->user()?->id);

        if ($payload === null) {
            return redirect()->route('auctions.index')
                ->with('error', 'Subasta no disponible.');
        }

        $related = $this->catalog->publicCatalog($request->user()?->id)
            ->filter(fn (array $item): bool => (int) $item['id'] !== (int) $auction->id && ($item['is_live'] ?? false))
            ->take(3)
            ->values()
            ->all();

        return Inertia::render('Auctions/Show', [
            'auction'          => $payload,
            'relatedAuctions'  => $related,
        ]);
    }

    public function placeBid(PlaceBidRequest $request, Auction $auction): RedirectResponse
    {
        $this->catalog->autoCloseExpiredLiveAuctions();

        try {
            $user = $request->user();
            if ($user !== null && ! $user->canAccessAuctions() && $user->role !== 'admin') {
                throw new RuntimeException('Las subastas están reservadas a socios VIP o con taquilla.');
            }

            $this->placeBid->execute(new PlaceBidDto(
                auctionId: (int) $auction->id,
                userId: (int) $request->user()->id,
                amountCents: (int) $request->validated('amount_cents'),
            ));
        } catch (RuntimeException $e) {
            return redirect()
                ->route('auctions.show', $auction->slug)
                ->with('error', $e->getMessage());
        }

        return redirect()
            ->route('auctions.show', $auction->slug)
            ->with('success', 'Puja registrada correctamente.');
    }

    public function pay(Request $request, Auction $auction): RedirectResponse
    {
        $user = $request->user();
        if ($user === null || (! $user->canAccessAuctions() && $user->role !== 'admin')) {
            return back()->with('error', 'Las subastas están reservadas a socios VIP o con taquilla.');
        }

        try {
            $url = $this->settlement->initiateWinnerPayment($auction, (int) $request->user()->id);

            return $this->redirectToStripeCheckout($url);
        } catch (RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }
    }
}
