<?php

declare(strict_types=1);

use App\Contracts\Payments\StartsCheckout;
use App\Enums\AuctionCategory;
use App\Enums\AuctionStatus;
use App\Enums\PaymentStatus;
use App\Models\Auction;
use App\Models\PaymentWebhookIdempotency;
use App\Models\User;
use App\Services\Auctions\AuctionSettlementService;
use Tests\Support\RecordingCheckoutFake;

function endedAuctionWithWinner(User $winner): Auction
{
    return Auction::query()->create([
        'title' => 'Tabla de prueba',
        'slug' => 'tabla-prueba-'.uniqid(),
        'category' => AuctionCategory::Accessory,
        'starting_price_cents' => 10000,
        'current_price_cents' => 25000,
        'min_increment_cents' => 500,
        'status' => AuctionStatus::Ended,
        'payment_status' => PaymentStatus::Pending,
        'winner_user_id' => $winner->id,
        'bid_count' => 3,
    ]);
}

test('el doble clic del ganador no abre una segunda sesión de pago', function () {
    $fake = new RecordingCheckoutFake;
    $this->app->instance(StartsCheckout::class, $fake);

    $winner = User::factory()->create();
    $auction = endedAuctionWithWinner($winner);

    $this->actingAs($winner);

    $service = app(AuctionSettlementService::class);
    $first = $service->initiateWinnerPayment($auction, (int) $winner->id);
    $second = $service->initiateWinnerPayment($auction->fresh(), (int) $winner->id);

    expect($second)->toBe($first)
        ->and($fake->calls)->toBe(1)
        ->and(PaymentWebhookIdempotency::query()
            ->where('payable_type', Auction::class)
            ->where('payable_id', $auction->id)
            ->where('status', 'pending')
            ->count())->toBe(1);
});

test('una sesión caducada sí permite abrir otra', function () {
    $fake = new RecordingCheckoutFake;
    $this->app->instance(StartsCheckout::class, $fake);

    $winner = User::factory()->create();
    $auction = endedAuctionWithWinner($winner);

    $this->actingAs($winner);

    $service = app(AuctionSettlementService::class);
    $service->initiateWinnerPayment($auction, (int) $winner->id);

    PaymentWebhookIdempotency::query()
        ->where('payable_type', Auction::class)
        ->where('payable_id', $auction->id)
        ->update(['expires_at' => now()->subHour()]);

    $service->initiateWinnerPayment($auction->fresh(), (int) $winner->id);

    expect($fake->calls)->toBe(2);
});

test('quien no ganó la subasta no puede iniciar el cobro', function () {
    $fake = new RecordingCheckoutFake;
    $this->app->instance(StartsCheckout::class, $fake);

    $winner = User::factory()->create();
    $intruso = User::factory()->create();
    $auction = endedAuctionWithWinner($winner);

    $this->actingAs($intruso);

    expect(fn () => app(AuctionSettlementService::class)
        ->initiateWinnerPayment($auction, (int) $intruso->id))
        ->toThrow(RuntimeException::class, 'No eres el ganador');

    expect($fake->calls)->toBe(0);
});

test('una subasta ya pagada no vuelve a abrir cobro', function () {
    $fake = new RecordingCheckoutFake;
    $this->app->instance(StartsCheckout::class, $fake);

    $winner = User::factory()->create();
    $auction = endedAuctionWithWinner($winner);
    $auction->update(['payment_status' => PaymentStatus::Confirmed]);

    $this->actingAs($winner);

    expect(fn () => app(AuctionSettlementService::class)
        ->initiateWinnerPayment($auction->fresh(), (int) $winner->id))
        ->toThrow(RuntimeException::class, 'ya está pagada');

    expect($fake->calls)->toBe(0);
});

test('el payload público de la subasta no expone al ganador ni el estado de cobro', function () {
    $winner = User::factory()->create();
    $auction = endedAuctionWithWinner($winner);

    $public = $auction->toPublicArray((int) $winner->id);

    expect($public)->not->toHaveKey('winner_user_id')
        ->and($public)->not->toHaveKey('payment_status')
        ->and($public['is_winner'])->toBeTrue()
        ->and($public['can_pay'])->toBeTrue();

    $anon = $auction->toPublicArray();

    expect($anon['is_winner'])->toBeFalse()
        ->and($anon['can_pay'])->toBeFalse();
});
