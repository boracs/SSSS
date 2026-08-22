<?php

declare(strict_types=1);

use App\Enums\AuctionCategory;
use App\Enums\AuctionStatus;
use App\Enums\FiscalInvoiceStatus;
use App\Enums\Invoicing\FiscalInvoiceCategory;
use App\Enums\PaymentStatus;
use App\Models\Auction;
use App\Models\FiscalInvoice;
use App\Models\User;

test('mis facturas incluye subastas del ganador y no inventa segunda mano', function () {
    config(['invoicing.enabled' => true]);

    $winner = User::factory()->create(['email' => 'ganador@example.com']);
    $other = User::factory()->create();

    $auction = Auction::query()->create([
        'title' => 'Leash de prueba',
        'slug' => 'leash-prueba-'.uniqid(),
        'category' => AuctionCategory::Accessory,
        'starting_price_cents' => 1000,
        'current_price_cents' => 2500,
        'min_increment_cents' => 100,
        'status' => AuctionStatus::Settled,
        'payment_status' => PaymentStatus::Confirmed,
        'winner_user_id' => $winner->id,
    ]);

    $invoice = FiscalInvoice::query()->create([
        'payable_type' => Auction::class,
        'payable_id' => $auction->id,
        'stripe_checkout_session_id' => 'cs_test_auction_list',
        'amount_cents' => 2500,
        'status' => FiscalInvoiceStatus::Processing,
        'b2b_invoice_id' => 'inv_auction_1',
    ]);

    expect(FiscalInvoiceCategory::tryFrom('segunda_mano'))->toBeNull()
        ->and(FiscalInvoiceCategory::Subastas->isEnabled())->toBeTrue();

    $this->actingAs($winner)
        ->get(route('my-invoices.index', ['category' => 'subastas']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Payments/MyInvoices')
            ->where('selected_category', 'subastas')
            ->has('items', 1)
            ->where('items.0.id', $invoice->id)
            ->where('items.0.category', 'subastas'));

    $this->actingAs($other)
        ->get(route('my-invoices.index', ['category' => 'subastas']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Payments/MyInvoices')
            ->has('items', 0));
});
