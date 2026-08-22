<?php

declare(strict_types=1);

use App\Services\Store\StoreProductPricing;
use App\Support\MoneyCents;

test('el descuento se aplica en céntimos, no en float de euros', function () {
    expect(StoreProductPricing::unitPriceCents('19.99', 10))->toBe(1799)
        ->and(StoreProductPricing::unitPriceCents(10, 15))->toBe(850)
        ->and(StoreProductPricing::lineTotalCents('19.99', 10, 3))->toBe(5397);
});

test('sin descuento el precio es el catálogo en céntimos', function () {
    expect(StoreProductPricing::unitPriceCents('19.99', 0))->toBe(1999)
        ->and(StoreProductPricing::unitPriceEuros('19.99', 0))->toBe(19.99);
});

test('euros y céntimos redondean de ida y vuelta', function () {
    $cents = StoreProductPricing::unitPriceCents(19.99, 15);
    expect(MoneyCents::eurosToCents(MoneyCents::centsToEuros($cents)))->toBe($cents);
});
