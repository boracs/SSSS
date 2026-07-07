/** Metadatos visuales compartidos — gestor admin de clases S4 */

export const MODALITY_FILTERS = [
    { id: "all", label: "Todas", dot: null },
    { id: "vip", label: "VIP", dot: "bg-violet-500 ring-1 ring-violet-400/40" },
    { id: "grupal", label: "Grupales", dot: "bg-emerald-500" },
    { id: "semanal", label: "Semanales", dot: "bg-sky-500" },
    { id: "particular", label: "Particulares", dot: "bg-amber-500" },
];

export const MODALITY_META = {
    vip: {
        label: "VIP",
        pill: "bg-violet-500/15 text-violet-200 ring-violet-400/30 border-violet-500/25",
        dot: "bg-violet-400",
        accent: "border-l-violet-500",
    },
    grupal: {
        label: "Grupal",
        pill: "bg-emerald-500/15 text-emerald-200 ring-emerald-400/30 border-emerald-500/25",
        dot: "bg-emerald-400",
        accent: "border-l-emerald-500",
    },
    semanal: {
        label: "Semanal",
        pill: "bg-sky-500/15 text-sky-200 ring-sky-400/30 border-sky-500/25",
        dot: "bg-sky-400",
        accent: "border-l-sky-500",
    },
    particular: {
        label: "Particular",
        pill: "bg-amber-500/15 text-amber-200 ring-amber-400/30 border-amber-500/25",
        dot: "bg-amber-400",
        accent: "border-l-amber-500",
    },
};

export function resolveModality(lesson) {
    if (!lesson) return "grupal";
    const raw = String(lesson.modality || "").toLowerCase();
    if (raw && MODALITY_META[raw]) return raw;
    if (lesson.is_private) return "particular";
    return "grupal";
}

export function modalityMeta(lesson) {
    return MODALITY_META[resolveModality(lesson)] || MODALITY_META.grupal;
}
