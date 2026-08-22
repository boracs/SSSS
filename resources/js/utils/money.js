const eurFormatter = new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

export function formatEur(amount) {
    const value = Number(amount);
    if (!Number.isFinite(value)) {
        return "-";
    }
    return eurFormatter.format(value);
}

export function formatEurFromCents(cents) {
    return formatEur(Number(cents) / 100);
}

export function eurosToCents(euros) {
    const n = Number(String(euros ?? 0).replace(",", "."));
    if (!Number.isFinite(n)) {
        return 0;
    }

    return Math.round(n * 100);
}

/** Misma fórmula que StoreProductPricing::unitPriceCents */
export function storeUnitPriceCents(precioEuros, descuentoPercent) {
    const baseCents = eurosToCents(precioEuros);
    const descuento = Number(descuentoPercent);
    if (!Number.isFinite(descuento) || descuento <= 0) {
        return baseCents;
    }

    return Math.round((baseCents * (100 - descuento)) / 100);
}
