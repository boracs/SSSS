/**
 * Smoke: primer clic fuera solo cierra el popover; el segundo ya navega.
 * node scripts/smoke-store-access-dismiss.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.APP_URL || "http://127.0.0.1:8000";

async function assertDismissThenNavigate(page, label) {
    const start = page.url();
    const add = page.locator('button[aria-haspopup="dialog"]').first();
    await add.waitFor({ state: "visible", timeout: 20000 });
    await add.scrollIntoViewIfNeeded();
    await add.click();
    await page.locator("[data-store-access-panel]").waitFor({ state: "visible", timeout: 5000 });
    await page.locator("[data-store-access-dismiss]").waitFor({ state: "visible", timeout: 5000 });

    // Clic lejos del panel (hit-test real, sin force)
    await page.mouse.click(24, 180);
    await page.waitForTimeout(250);

    const closed =
        (await page.locator("[data-store-access-panel]").count()) === 0 && page.url() === start;
    if (!closed) {
        throw new Error(`[${label}] primer clic fuera no cerró solo el popover`);
    }

    // Buscar otra tarjeta y navegar en el segundo clic
    const card = page.locator("article.group, .group.relative").nth(2);
    await card.scrollIntoViewIfNeeded();
    const box = await card.boundingBox();
    if (!box) throw new Error(`[${label}] no hay tarjeta objetivo`);

    await page.mouse.click(box.x + 36, box.y + 36);
    await page.waitForTimeout(900);
    if (page.url() === start) {
        throw new Error(`[${label}] el segundo clic no navegó`);
    }
    console.log(`PASS ${label}`, { from: start, to: page.url() });
}

async function main() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

    await page.goto(`${BASE}/tienda`, { waitUntil: "networkidle", timeout: 60000 });
    await assertDismissThenNavigate(page, "tienda");

    await page.goto(`${BASE}/producto-ver/38`, { waitUntil: "networkidle", timeout: 60000 });
    await assertDismissThenNavigate(page, "producto-ver+ofertas");

    await browser.close();
    console.log("ALL PASS");
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
