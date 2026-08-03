/**
 * Espejo JS del cálculo de precio de alquiler.
 * Fuente de verdad: App\Services\BookingService::priceForMinutes + PriceSchema::getPacksByMinutes.
 * Cualquier cambio de packs o de algoritmo debe aplicarse en AMBOS lados.
 */

export const MINUTES_PER_DAY = 1440;

/** Granularidad del DP (mcd de 60 y 90 min) — config('rentals.pricing_step_minutes'). */
export const PRICING_STEP_MINUTES = 30;

/** Packs cortos: minutos cobrados → columna del esquema. */
export const MINUTE_PACKS = {
    60: "price_60m",
    90: "price_90m",
    120: "price_120m",
    180: "price_180m",
    240: "price_240m",
    360: "price_360m",
};

/** Packs largos: días del ciclo 12:00 → 12:00 → columna del esquema. */
export const DAY_PACKS = {
    1: "price_1d",
    2: "price_2d",
    3: "price_3d",
    4: "price_4d",
    5: "price_5d",
    7: "price_week",
};

/** Etiqueta pública de cada pack. Única fuente de textos de duración en la UI. */
export const PACK_LABELS = {
    price_60m: "1 h",
    price_90m: "1,5 h",
    price_120m: "2 h",
    price_180m: "3 h",
    price_240m: "4 h",
    price_360m: "6 h",
    price_1d: "1 día",
    price_2d: "2 días",
    price_3d: "3 días",
    price_4d: "4 días",
    price_5d: "5 días",
    price_week: "Semana",
};

export function packLabel(column) {
    return PACK_LABELS[column] ?? column;
}

/**
 * Todos los packs vendibles indexados por minutos (precio > 0).
 * @returns {Record<number, number>|null}
 */
export function buildPacksFromSchema(priceSchema) {
    if (!priceSchema) return null;

    const packs = {};

    for (const [minutes, column] of Object.entries(MINUTE_PACKS)) {
        const price = Number(priceSchema[column] || 0);
        if (price > 0) packs[Number(minutes)] = price;
    }

    for (const [days, column] of Object.entries(DAY_PACKS)) {
        const price = Number(priceSchema[column] || 0);
        if (price > 0) packs[Number(days) * MINUTES_PER_DAY] = price;
    }

    return packs;
}

/**
 * Mejor combinación de packs para cubrir `minutes`. Un pack puede sobrar: se
 * paga entero aunque el tramo restante sea menor (misma regla que mostrador).
 */
export function priceForMinutes(packs, minutes) {
    if (!packs || minutes <= 0) return 0;

    const entries = Object.entries(packs)
        .map(([packMinutes, price]) => [Number(packMinutes), Number(price)])
        .filter(([packMinutes, price]) => packMinutes > 0 && price > 0);

    if (entries.length === 0) return 0;

    const slots = Math.ceil(minutes / PRICING_STEP_MINUTES);
    const cost = new Array(slots + 1).fill(0);

    for (let slot = 1; slot <= slots; slot++) {
        let best = null;
        for (const [packMinutes, price] of entries) {
            const packSlots = Math.max(1, Math.ceil(packMinutes / PRICING_STEP_MINUTES));
            const candidate = price + cost[Math.max(0, slot - packSlots)];
            if (best === null || candidate < best) best = candidate;
        }
        cost[slot] = best;
    }

    return Math.round(cost[slots] * 100) / 100;
}

/**
 * Días cobrados de una selección de calendario (modo día).
 * Mismo día = 1 día; D → D+2 = 2 días. Espejo de BookingService::deriveDaysFromRange.
 */
export function chargedDaysFromRange(startDate, endDate) {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date(startDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;

    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const days = Math.round((end.getTime() - start.getTime()) / (MINUTES_PER_DAY * 60000));

    return Math.max(1, days);
}

/** Precio de una selección de calendario en modo día. */
export function priceForDayRange(packs, startDate, endDate) {
    if (!packs || !startDate) return 0;

    return priceForMinutes(packs, chargedDaysFromRange(startDate, endDate) * MINUTES_PER_DAY);
}
