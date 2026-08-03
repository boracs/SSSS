/**
 * Lado JS de la paridad de precios de alquiler.
 *
 * Calcula con resources/js/lib/rentalPricing.js los casos de
 * tests/Fixtures/rental-pricing-cases.json y los escribe en stdout como JSON.
 * Lo ejecuta y compara Tests\Unit\Rentals\RentalPricingJsParityTest.
 *
 *   node tests/Js/rental-pricing-parity.mjs
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
    DAY_PACKS,
    MINUTE_PACKS,
    PRICING_STEP_MINUTES,
    buildPacksFromSchema,
    priceForMinutes,
} from "../../resources/js/lib/rentalPricing.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(
    readFileSync(resolve(here, "../Fixtures/rental-pricing-cases.json"), "utf8"),
);

const packs = buildPacksFromSchema(fixture.schema);

process.stdout.write(
    JSON.stringify({
        pricing_step_minutes: PRICING_STEP_MINUTES,
        minute_packs: MINUTE_PACKS,
        day_packs: DAY_PACKS,
        sellable_packs: packs,
        prices: fixture.cases.map((testCase) => ({
            minutes: testCase.minutes,
            price: priceForMinutes(packs, testCase.minutes),
        })),
    }),
);
