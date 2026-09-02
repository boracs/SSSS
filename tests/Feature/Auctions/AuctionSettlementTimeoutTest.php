<?php

declare(strict_types=1);

use App\Contracts\Payments\StartsCheckout;
use App\Enums\AuctionCategory;
use App\Enums\AuctionStatus;
use App\Enums\PaymentStatus;
use App\Models\Auction;
use App\Models\User;
use App\Services\Auctions\AuctionSettlementService;
use Carbon\Carbon;
use Tests\Support\RecordingCheckoutFake;

beforeEach(function () {
    Carbon::setTestNow('2026-08-27 12:00:00');
    config(['auctions.payment_grace_minutes' => 1440]);
});

afterEach(function () {
    Carbon::setTestNow();
});

function pendingEndedAuction(User $winner, ?Carbon $deadline = null): Auction
{
    return Auction::query()->create([
        'title' => 'Tabla con plazo',
        'slug' => 'tabla-plazo-'.uniqid(),
        'category' => AuctionCategory::Accessory,
        'starting_price_cents' => 10000,
        'current_price_cents' => 25000,
        'min_increment_cents' => 500,
        'status' => AuctionStatus::Ended,
        'payment_status' => PaymentStatus::Pending,
        'winner_user_id' => $winner->id,
        'bid_count' => 2,
        'payment_deadline_at' => $deadline,
    ]);
}

test('al cerrar con puja se fija payment_deadline_at según el margen de gracia', function () {
    $winner = User::factory()->create();
    $auction = Auction::query()->create([
        'title' => 'Live a cerrar',
        'slug' => 'live-cerrar-'.uniqid(),
        'category' => AuctionCategory::Accessory,
        'starting_price_cents' => 10000,
        'current_price_cents' => 15000,
        'min_increment_cents' => 500,
        'status' => AuctionStatus::Live,
        'winner_user_id' => $winner->id,
        'bid_count' => 1,
        'ends_at' => now()->subMinute(),
    ]);

    expect(app(AuctionSettlementService::class)->closeAuction($auction))->toBeTrue();

    $fresh = $auction->fresh();
    expect($fresh->status)->toBe(AuctionStatus::Ended)
        ->and($fresh->payment_status)->toBe(PaymentStatus::Pending)
        ->and($fresh->payment_deadline_at?->format('Y-m-d H:i'))->toBe('2026-08-28 12:00');
});

test('expire-unpaid revierte una subasta con plazo vencido y el ganador ya no puede pagar', function () {
    $fake = new RecordingCheckoutFake;
    $this->app->instance(StartsCheckout::class, $fake);

    $winner = User::factory()->create();
    $auction = pendingEndedAuction($winner, now()->subMinute());
    $future = pendingEndedAuction($winner, now()->addHour());

    $this->artisan('auctions:expire-unpaid')->assertSuccessful();

    $expired = $auction->fresh();
    expect($expired->status)->toBe(AuctionStatus::Ended)
        ->and($expired->winner_user_id)->toBeNull()
        ->and($expired->payment_status)->toBeNull()
        ->and($expired->payment_deadline_at)->toBeNull()
        ->and($expired->toPublicArray((int) $winner->id)['can_pay'])->toBeFalse();

    $this->actingAs($winner);

    expect(fn () => app(AuctionSettlementService::class)
        ->initiateWinnerPayment($expired, (int) $winner->id))
        ->toThrow(RuntimeException::class);

    expect($fake->calls)->toBe(0);

    $untouched = $future->fresh();
    expect($untouched->winner_user_id)->toBe((int) $winner->id)
        ->and($untouched->payment_status)->toBe(PaymentStatus::Pending)
        ->and($untouched->payment_deadline_at)->not->toBeNull();
});

test('un deadline futuro no se toca y el ganador sí puede abrir cobro', function () {
    $fake = new RecordingCheckoutFake;
    $this->app->instance(StartsCheckout::class, $fake);

    $winner = User::factory()->create();
    $auction = pendingEndedAuction($winner, now()->addDay());

    $this->artisan('auctions:expire-unpaid')->assertSuccessful();

    $fresh = $auction->fresh();
    expect($fresh->winner_user_id)->toBe((int) $winner->id)
        ->and($fresh->payment_status)->toBe(PaymentStatus::Pending)
        ->and($fresh->toPublicArray((int) $winner->id)['can_pay'])->toBeTrue();

    $this->actingAs($winner);

    $url = app(AuctionSettlementService::class)
        ->initiateWinnerPayment($fresh, (int) $winner->id);

    expect($url)->toStartWith('https://checkout.stripe.test/')
        ->and($fake->calls)->toBe(1);
});

test('initiateWinnerPayment rechaza si el plazo ya pasó aunque el comando no haya barrido', function () {
    $fake = new RecordingCheckoutFake;
    $this->app->instance(StartsCheckout::class, $fake);

    $winner = User::factory()->create();
    $auction = pendingEndedAuction($winner, now()->subMinute());

    $this->actingAs($winner);

    expect(fn () => app(AuctionSettlementService::class)
        ->initiateWinnerPayment($auction, (int) $winner->id))
        ->toThrow(RuntimeException::class, 'El plazo para pagar esta subasta ha caducado.');

    expect($fake->calls)->toBe(0)
        ->and($auction->fresh()->winner_user_id)->toBe((int) $winner->id);
});
