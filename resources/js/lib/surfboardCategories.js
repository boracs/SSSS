/** Categorías de alquiler (espejo de Surfboard::CATEGORIES en PHP). */
export const BOARD_CATEGORIES = [
    { id: "soft", label: "Softboards" },
    { id: "hard_basic", label: "Hard boards" },
    { id: "hard_pro", label: "Premium boards" },
];

export function boardCategoryLabel(category) {
    return (
        BOARD_CATEGORIES.find((item) => item.id === category)?.label ??
        "Tabla de alquiler"
    );
}

/**
 * Acento visual por categoría (progresión básico → pro).
 * Tabla de tarifas + tabs del catálogo. Tonos Tailwind estándar, no marca.
 */
const CATEGORY_ACCENTS = {
    soft: {
        dot: "bg-emerald-400",
        bar: "bg-emerald-400",
        label: "text-emerald-300",
        tabActive: "bg-emerald-600 text-white ring-emerald-500",
    },
    hard_basic: {
        dot: "bg-amber-400",
        bar: "bg-amber-400",
        label: "text-amber-300",
        tabActive: "bg-amber-600 text-white ring-amber-500",
    },
    hard_pro: {
        dot: "bg-violet-400",
        bar: "bg-violet-400",
        label: "text-violet-300",
        tabActive: "bg-violet-600 text-white ring-violet-500",
    },
};

const FALLBACK_ACCENT = {
    dot: "bg-slate-400",
    bar: "bg-slate-400",
    label: "text-slate-300",
    tabActive: "bg-slate-600 text-white ring-slate-500",
};

export function boardCategoryAccent(category) {
    return CATEGORY_ACCENTS[category] ?? FALLBACK_ACCENT;
}
