/** Redondea HH:mm al cuarto de hora más cercano (intervalos de 15 min). */
export function roundQuarter(hhmm) {
    if (!hhmm || !hhmm.includes(":")) return hhmm;
    const [hRaw, mRaw] = hhmm.split(":").map((n) => Number(n));
    if (Number.isNaN(hRaw) || Number.isNaN(mRaw)) return hhmm;
    let total = (hRaw * 60) + mRaw;
    const rounded = Math.round(total / 15) * 15;
    total = Math.max(0, Math.min((23 * 60) + 45, rounded));
    const h = Math.floor(total / 60);
    const m = total % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export const QUARTER_MINUTES = ["00", "15", "30", "45"];

export const HOURS_24 = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));

/** @returns {{ hour: string, minute: string }} */
export function parseTime24(value, fallback = "09:00") {
    const raw = value && value.includes(":") ? value : fallback;
    const rounded = roundQuarter(raw);
    const [h, m] = rounded.split(":");
    return { hour: h, minute: m };
}
