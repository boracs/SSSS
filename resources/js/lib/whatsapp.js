/**
 * Helpers wa.me — escuela y contactos puntuales.
 * Número centralizado vía Inertia `academyWhatsappUrl` (.env ACADEMY_WHATSAPP_NUMBER).
 */

export const WHATSAPP_TOPICS = {
    general: "Hola, me gustaría información sobre la escuela.",
    contact: "Hola, me gustaría contactar con el equipo de la escuela.",
    payment: "Hola, tengo una duda con el pago de mi reserva de surf.",
    academy: "Hola, tengo una consulta sobre clases de surf.",
    rental: "Hola, tengo una consulta sobre alquiler de tablas.",
    locker: "Hola, me interesa información sobre las taquillas del club.",
    bono: "Hola, me gustaría información sobre bonos y membresía VIP.",
    store: "Hola, tengo una consulta sobre la tienda.",
};

/** Normaliza teléfono español a dígitos E.164 sin '+'. */
export function normalizePhoneDigits(phone) {
    const digits = String(phone ?? "").replace(/\D/g, "");
    if (!digits) return "";
    return digits.startsWith("34") ? digits : `34${digits}`;
}

/** wa.me para cualquier teléfono (Edy, Willy, alumno, etc.). */
export function whatsappUrlFromPhone(phone, message) {
    const digits = normalizePhoneDigits(phone);
    if (!digits) return null;
    const base = `https://wa.me/${digits}`;
    if (!message || String(message).trim() === "") return base;
    return `${base}?text=${encodeURIComponent(String(message).trim())}`;
}

/** Añade o sustituye el parámetro text sobre una URL wa.me base. */
export function whatsappUrlWithMessage(baseUrl, message) {
    if (!baseUrl) return null;
    const base = String(baseUrl).split("?")[0];
    if (!message || String(message).trim() === "") return base;
    return `${base}?text=${encodeURIComponent(String(message).trim())}`;
}

/** Prefiere prop de página; si no, prop global de Inertia. */
export function resolveAcademyWhatsappUrl(pageBaseUrl, message, globalBaseUrl) {
    const resolved = pageBaseUrl ?? globalBaseUrl ?? null;
    return whatsappUrlWithMessage(resolved, message);
}

export function detectWhatsappTopicFromPath(pathname = "") {
    const path = String(pathname).toLowerCase();
    if (path.includes("/academia") || path.includes("/clases") || path.includes("/mis-reservas")) {
        return "academy";
    }
    if (path.includes("/alquiler") || path.includes("/surfboards")) {
        return "rental";
    }
    if (path.includes("/taquilla")) {
        return "locker";
    }
    if (path.includes("/bonos") || path.includes("/vip")) {
        return "bono";
    }
    if (path.includes("/tienda") || path.includes("/carrito") || path.includes("/producto")) {
        return "store";
    }
    if (path.includes("/pago") || path.includes("/checkout")) {
        return "payment";
    }
    return "contact";
}

export function academyWhatsappUrlForPage(baseUrl, pathname) {
    const topic = detectWhatsappTopicFromPath(pathname);
    return whatsappUrlWithMessage(baseUrl, WHATSAPP_TOPICS[topic]);
}
