<?php

declare(strict_types=1);

use App\Support\MoneyCents;

test('netFromGrossInclusiveVat extrae la base de un total con IVA 21%', function () {
    expect(MoneyCents::netFromGrossInclusiveVat(4571, 21.0))->toBe(3778)
        ->and(MoneyCents::netFromGrossInclusiveVat(6000, 21.0))->toBe(4959)
        ->and(MoneyCents::netFromGrossInclusiveVat(1000, 0.0))->toBe(1000);
});
