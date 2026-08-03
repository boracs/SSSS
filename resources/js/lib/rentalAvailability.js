/**
 * Disponibilidad de alquiler en el cliente.
 * Espejo de App\Services\BookingService::isAvailable y de la ventana de
 * inventario [pickup_at, block_end]: el servidor vuelve a comprobarlo al reservar.
 * Se asume que el reloj del navegador es el de la escuela (Europe/Madrid).
 */

import { chargedDaysFromRange } from "./rentalPricing";

/** Valores de config/rentals.php; solo se usan si el backend no manda la política. */
export const DEFAULT_RENTAL_POLICY = {
    turnover_buffer_minutes: 30,
    pickup_flexibility_minutes: 30,
    day_mode_pickup_hour: 12,
    pickup_window_start: "09:00",
    pickup_window_end: "19:00",
    pickup_slot_step_minutes: 30,
    notes: [],
};

export function resolveRentalPolicy(raw) {
    return { ...DEFAULT_RENTAL_POLICY, ...(raw || {}) };
}

export function toDateSafe(value) {
    if (!value) return null;
    const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

/** "HH:MM" → minutos desde medianoche. */
export function timeToMinutes(time) {
    const match = /^(\d{1,2}):(\d{2})$/.exec(String(time || "").trim());
    if (!match) return null;
    return Number(match[1]) * 60 + Number(match[2]);
}

export function minutesToTime(minutes) {
    const total = Math.max(0, Math.round(minutes));
    const hh = String(Math.floor(total / 60) % 24).padStart(2, "0");
    const mm = String(total % 60).padStart(2, "0");
    return `${hh}:${mm}`;
}

export function formatTime(date) {
    const d = toDateSafe(date);
    if (!d) return "";
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** 'YYYY-MM-DD' del reloj local (sin desplazamiento a UTC). */
export function localDate(date) {
    const d = toDateSafe(date);
    if (!d) return null;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

/** 'YYYY-MM-DDTHH:mm' — formato que BusinessDateTime interpreta como hora de escuela. */
export function localDateTime(date) {
    const d = toDateSafe(date);
    if (!d) return null;
    return `${localDate(d)}T${formatTime(d)}`;
}

export function atMinutesOfDay(date, minutes) {
    const d = toDateSafe(date);
    if (!d) return null;
    d.setHours(0, 0, 0, 0);
    d.setMinutes(minutes);
    return d;
}

export function addMinutes(date, minutes) {
    const d = toDateSafe(date);
    if (!d) return null;
    d.setMinutes(d.getMinutes() + minutes);
    return d;
}

/**
 * Modo día normalizado a mediodía: espejo de BookingService::normalizeDayRange.
 * @returns {{days: number, pickupAt: Date, returnAt: Date}|null}
 */
export function normalizeDayWindow(startDate, endDate, policy) {
    const start = toDateSafe(startDate);
    if (!start) return null;

    const resolved = resolveRentalPolicy(policy);
    const days = chargedDaysFromRange(start, toDateSafe(endDate) || start);
    const pickupAt = atMinutesOfDay(start, Number(resolved.day_mode_pickup_hour) * 60);
    const returnAt = toDateSafe(pickupAt);
    returnAt.setDate(returnAt.getDate() + days);

    return { days, pickupAt, returnAt };
}

/** Rangos de inventario del API: start = pickup_at, end = block_end (buffer incluido). */
export function normalizeBlockedRanges(blockedRanges) {
    return (blockedRanges || [])
        .map((range) => {
            const start = toDateSafe(range?.start);
            const end = toDateSafe(range?.end);
            return start && end ? { start, end } : null;
        })
        .filter(Boolean);
}

/** Solape estricto: tocarse en los extremos no colisiona (para eso está el buffer). */
export function overlapsBlocked(ranges, start, end) {
    if (!start || !end) return false;
    return normalizeBlockedRanges(ranges).some(
        (range) => start < range.end && end > range.start,
    );
}

/**
 * Slots de recogida de un día para un pack concreto.
 * Se ofrece un slot si la devolución cobrada cabe en el horario de mostrador y
 * si [pickup, return + buffer] no pisa ninguna ventana ocupada.
 *
 * @returns {{time: string, pickupAt: Date, returnAt: Date, available: boolean}[]}
 */
export function buildPickupSlots({ date, packMinutes, policy, blockedRanges = [], now = new Date() }) {
    const day = toDateSafe(date);
    const pack = Number(packMinutes);
    if (!day || !Number.isFinite(pack) || pack <= 0) return [];

    const resolved = resolveRentalPolicy(policy);
    const open = timeToMinutes(resolved.pickup_window_start) ?? 0;
    const close = timeToMinutes(resolved.pickup_window_end) ?? 24 * 60;
    const step = Math.max(5, Number(resolved.pickup_slot_step_minutes) || 30);
    const buffer = Math.max(0, Number(resolved.turnover_buffer_minutes) || 0);
    const ranges = normalizeBlockedRanges(blockedRanges);
    const reference = toDateSafe(now) || new Date();

    const slots = [];

    for (let minute = open; minute + pack <= close; minute += step) {
        const pickupAt = atMinutesOfDay(day, minute);
        const returnAt = addMinutes(pickupAt, pack);
        const blockEnd = addMinutes(returnAt, buffer);
        const inThePast = pickupAt <= reference;

        slots.push({
            time: minutesToTime(minute),
            pickupAt,
            returnAt,
            available: !inThePast && !overlapsBlocked(ranges, pickupAt, blockEnd),
        });
    }

    return slots;
}
