/**
 * CTA contextual del Parte S4 según señal del día (CRO — sin tocar backend).
 */

const CTA_BY_SIGNAL = {
    good: {
        label: "Reserva clase de iniciación",
        href: () => route("servicios.surf"),
        tone: "primary",
    },
    espigon: {
        label: "Apúntate a iniciación en el espigón",
        href: () => route("servicios.surf"),
        tone: "primary",
    },
    caution: {
        label: "Clases y particulares",
        href: () => `${route("servicios.surf")}#particulares`,
        tone: "secondary",
    },
    closed: {
        label: "Ver webcam en directo",
        href: () => `${route("servicios.webcams")}#webcam-directo`,
        tone: "safe",
    },
};

/** Nivel destacado según señal (heurística monitor, no IA). */
const RECOMMENDED_LEVEL_BY_SIGNAL = {
    good: "iniciacion",
    espigon: "iniciacion",
    caution: "intermedio",
    closed: "avanzado",
};

export function surfBriefCtaForSignal(status) {
    if (!status) return null;
    return CTA_BY_SIGNAL[status] || null;
}

export function surfBriefRecommendedLevel(status) {
    if (!status) return null;
    return RECOMMENDED_LEVEL_BY_SIGNAL[status] || null;
}

export const SURF_LEVEL_PREF_KEY = "s4-surf-level-pref";
