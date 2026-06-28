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
