import { ChevronDown, ChevronUp } from "lucide-react";

/**
 * Cabecera de columna ordenable (chevrones apilados; activo en sky/cian).
 */
export function SortableTh({
    label,
    sortKey,
    activeKey,
    activeDir,
    onSort,
    className = "px-4 py-3 text-left",
}) {
    const active = activeKey === sortKey;
    return (
        <th className={className}>
            <button
                type="button"
                onClick={() => onSort(sortKey)}
                className="group inline-flex items-center gap-1 rounded-md text-left font-medium text-gray-200 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60"
                title={`Ordenar por ${label}`}
            >
                <span>{label}</span>
                <span className="inline-flex flex-col leading-none" aria-hidden="true">
                    <ChevronUp
                        className={`h-3 w-3 -mb-0.5 ${active && activeDir === "asc" ? "text-sky-400" : "text-gray-500 group-hover:text-gray-300"}`}
                    />
                    <ChevronDown
                        className={`h-3 w-3 ${active && activeDir === "desc" ? "text-sky-400" : "text-gray-500 group-hover:text-gray-300"}`}
                    />
                </span>
            </button>
        </th>
    );
}

/**
 * Compara dos filas usando getSortValue(row, key) → number | string.
 */
export function compareRows(a, b, key, dir, getSortValue) {
    const va = getSortValue(a, key);
    const vb = getSortValue(b, key);
    let cmp = 0;
    if (typeof va === "number" && typeof vb === "number") {
        cmp = va - vb;
    } else {
        cmp = String(va).localeCompare(String(vb), "es");
    }
    return dir === "asc" ? cmp : -cmp;
}
