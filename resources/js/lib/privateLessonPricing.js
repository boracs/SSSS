/**
 * Espejo en cliente de App\Services\Academy\PrivateLessonPricingService.
 * La tarifa real llega en la prop compartida `academyPrivateLesson` (editable
 * desde el admin); los valores de abajo solo son respaldo si aún no ha cargado.
 * Sirve para mostrar precios: el importe cobrado lo recalcula siempre el backend.
 */

const DEFAULT_BASE_MINUTES = 90;
const DEFAULT_DEPOSIT_PERCENTAGE = 30;

/** Respaldo: precio TOTAL del grupo en céntimos a la duración base. */
const FALLBACK_TARIFF_CENTS = {
    1: 8000,
    2: 11000,
    3: 12000,
    4: 12000,
    5: 15000,
    6: 18000,
};

function normalizeTariff(tariffCents) {
    const entries = Object.entries(tariffCents || {})
        .map(([people, cents]) => [Number(people), Number(cents)])
        .filter(
            ([people, cents]) =>
                Number.isFinite(people) && Number.isFinite(cents) && people > 0 && cents > 0,
        );

    return entries.length > 0 ? Object.fromEntries(entries) : { ...FALLBACK_TARIFF_CENTS };
}

function baseTariffCentsFor(tariff, people) {
    if (tariff[people] != null) return tariff[people];

    const keys = Object.keys(tariff).map(Number);
    const maxPeople = Math.max(...keys);

    return people > maxPeople ? tariff[maxPeople] : tariff[Math.min(...keys)];
}

/**
 * @param {{tariff_cents?: Record<number, number>, base_minutes?: number, deposit_percentage?: number}} pricing
 * @returns {{people: number, durationMinutes: number, totalCents: number, depositCents: number, remainingCents: number, perPersonCents: number}}
 */
export function quotePrivateLesson(pricing, peopleCount, durationMinutes) {
    const tariff = normalizeTariff(pricing?.tariff_cents);
    const baseMinutes = Math.max(1, Number(pricing?.base_minutes) || DEFAULT_BASE_MINUTES);
    const percentage = Math.min(
        100,
        Math.max(0, Number(pricing?.deposit_percentage ?? DEFAULT_DEPOSIT_PERCENTAGE)),
    );

    const people = Math.max(1, Math.floor(Number(peopleCount) || 1));
    const minutes = Math.max(1, Number(durationMinutes) || baseMinutes);

    const baseCents = baseTariffCentsFor(tariff, people);
    const totalCents = Math.round((baseCents * minutes) / baseMinutes / 100) * 100;
    const depositCents = Math.min(
        totalCents,
        Math.max(0, Math.round(totalCents * (percentage / 100))),
    );

    return {
        people,
        durationMinutes: minutes,
        totalCents,
        depositCents,
        remainingCents: Math.max(0, totalCents - depositCents),
        perPersonCents: Math.round(totalCents / people),
    };
}

/**
 * Filas del tarifario público (Info · Clases de surf), a la duración base.
 * @returns {Array<{ pax: string, precio: string, nota: string }>}
 */
export function privateLessonPriceRows(pricing) {
    const tariff = normalizeTariff(pricing?.tariff_cents);

    return Object.keys(tariff)
        .map(Number)
        .sort((a, b) => a - b)
        .map((people) => {
            const quote = quotePrivateLesson(pricing, people, pricing?.base_minutes);

            return {
                pax: people === 1 ? "1 persona" : `${people} personas`,
                precio: `${Math.round(quote.perPersonCents / 100)} €`,
                nota: people === 1 ? "total" : "por persona",
            };
        });
}

export function formatEurosFromCents(cents) {
    return new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 2,
    }).format((Number(cents) || 0) / 100);
}
