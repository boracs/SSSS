/**
 * Niveles del Parte S4 (auto + override admin).
 * `badge` = mensaje completo visible al público.
 */
export const SURF_BRIEF_OVERRIDES = {
    good: {
        status: "good",
        badge: "Poco oleaje · Totalmente seguro",
        buttonTitle: "Poco oleaje",
        buttonSub: "Totalmente seguro",
        adminClass: "bg-emerald-600 text-white",
        miniTone: "bg-emerald-50 text-emerald-700 ring-emerald-200",
        tableWrap: "border-emerald-200/90 bg-white",
        tableBadge: "bg-emerald-600 text-white",
    },
    espigon: {
        status: "espigon",
        badge: "Ideal para aprender · Iniciación en el espigón",
        buttonTitle: "Ideal para aprender",
        buttonSub: "Iniciación en el espigón",
        adminClass: "bg-yellow-400 text-slate-900",
        miniTone: "bg-yellow-50 text-yellow-800 ring-yellow-300",
        tableWrap: "border-amber-200/90 bg-white",
        tableBadge: "bg-amber-500 text-white",
    },
    caution: {
        status: "caution",
        badge: "Cuidado · Oleaje moderado",
        buttonTitle: "Oleaje moderado",
        buttonSub: "Cuidado",
        adminClass: "bg-amber-600 text-white",
        miniTone: "bg-amber-50 text-amber-700 ring-amber-200",
        tableWrap: "border-amber-300/90 bg-white",
        tableBadge: "bg-amber-600 text-white",
    },
    closed: {
        status: "closed",
        badge: "Peligroso · Avanzado o baño no recomendado",
        buttonTitle: "Peligroso",
        buttonSub: "Avanzado / baño no recomendado",
        adminClass: "bg-rose-600 text-white",
        miniTone: "bg-rose-50 text-rose-700 ring-rose-200",
        tableWrap: "border-rose-200/90 bg-white",
        tableBadge: "bg-rose-600 text-white",
    },
};

/** Orden de botones admin: verde → amarillo → naranja → rojo */
export const SURF_BRIEF_OVERRIDE_ORDER = ["good", "espigon", "caution", "closed"];

export function surfBriefOverrideMeta(status) {
    return SURF_BRIEF_OVERRIDES[status] || null;
}
