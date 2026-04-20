/**
 * Horario de negocio: Europa/Madrid.
 * El API de lecciones envía ISO con offset (ej. 2026-04-02T10:00:00+02:00), no UTC-Z,
 * para que Date + Intl no desplacen la hora respecto a la BD.
 */

export const BUSINESS_TIMEZONE = "Europe/Madrid";

const ymdFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
});

/**
 * @param {Date|string|number} instant
 * @returns {string} YYYY-MM-DD en calendario de Madrid
 */
export function toYmdInMadrid(instant) {
    const d = instant instanceof Date ? instant : new Date(instant);
    return ymdFormatter.format(d);
}

export function todayYmdInMadrid() {
    return ymdFormatter.format(new Date());
}

/** Comparación de clave Y-m-d frente a hoy en Madrid. */
export function isPastCalendarDayMadrid(iso) {
    if (!iso || typeof iso !== "string") return false;
    return iso < todayYmdInMadrid();
}

/**
 * @param {Date|string|number} instant
 * @param {Intl.DateTimeFormatOptions} [extra]
 */
export function formatTimeMadrid(instant, extra = {}) {
    const d = instant instanceof Date ? instant : new Date(instant);
    return d.toLocaleTimeString("es-ES", {
        timeZone: BUSINESS_TIMEZONE,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        ...extra,
    });
}

/**
 * @param {Date|string|number} instant
 * @param {Intl.DateTimeFormatOptions} [extra]
 */
export function formatDateTimeMadrid(instant, extra = {}) {
    const d = instant instanceof Date ? instant : new Date(instant);
    return d.toLocaleString("es-ES", {
        timeZone: BUSINESS_TIMEZONE,
        ...extra,
    });
}

/**
 * @param {Date|string|number} instant
 * @param {Intl.DateTimeFormatOptions} [extra]
 */
export function formatDateMadrid(instant, extra = {}) {
    const d = instant instanceof Date ? instant : new Date(instant);
    return d.toLocaleDateString("es-ES", {
        timeZone: BUSINESS_TIMEZONE,
        ...extra,
    });
}

/**
 * Etiqueta larga para una fecha civil Y-m-d (sin depender del huso del navegador).
 * @param {string} dateYmd
 */
export function formatLongDateLabelMadrid(dateYmd) {
    if (!dateYmd || !/^\d{4}-\d{2}-\d{2}$/.test(dateYmd)) return dateYmd || "";
    const [y, mo, day] = dateYmd.split("-").map(Number);
    const inst = new Date(Date.UTC(y, mo - 1, day, 12, 0, 0));
    return inst.toLocaleDateString("es-ES", {
        timeZone: BUSINESS_TIMEZONE,
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

/**
 * @param {number} year
 * @param {number} month1to12
 */
export function formatMonthYearMadridFromYearMonth(year, month1to12) {
    const inst = new Date(Date.UTC(year, month1to12 - 1, 15, 12, 0, 0));
    return inst.toLocaleDateString("es-ES", {
        timeZone: BUSINESS_TIMEZONE,
        month: "long",
        year: "numeric",
    });
}

/** Suma minutos en reloj de 24h (misma fecha civil; adecuado para duraciones de clase). */
export function addMinutesToHhmm(hhmm, deltaMinutes) {
    const [h, m] = String(hhmm || "00:00").split(":").map((n) => Number(n));
    if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
    let t = h * 60 + m + Number(deltaMinutes || 0);
    t = ((t % (24 * 60)) + 24 * 60) % (24 * 60);
    const hh = Math.floor(t / 60);
    const mm = t % 60;
    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}
