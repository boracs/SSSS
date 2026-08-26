import React, { useMemo } from "react";
import { router } from "@inertiajs/react";

/**
 * Píldoras de categoría de producto (tienda, ficha, carrito).
 * @param {"dark"|"light"} surface
 * @param {boolean} linkable — navega a /tienda?tag= (botón, válido dentro de cards enlazadas)
 */
export default function ProductTagPills({
    tags = null,
    values = [],
    labels = [],
    surface = "dark",
    max = 2,
    linkable = false,
    className = "",
    ariaLabel = "Categorías del producto",
}) {
    const items = useMemo(() => {
        if (Array.isArray(tags) && tags.length > 0) {
            return tags
                .filter((item) => item?.label)
                .slice(0, max)
                .map((item) => ({ value: item.value ?? "", label: item.label }));
        }

        const slugs = Array.isArray(values) ? values : [];
        const names = Array.isArray(labels) ? labels : [];

        return slugs
            .slice(0, max)
            .map((value, index) => ({
                value: String(value ?? ""),
                label: names[index] || String(value ?? ""),
            }))
            .filter((item) => item.label);
    }, [tags, values, labels, max]);

    if (items.length === 0) {
        return null;
    }

    const pillClass =
        surface === "light"
            ? "rounded-full border border-cyan-500/25 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold leading-tight text-s4 sm:px-2.5 sm:text-xs"
            : "rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold leading-tight text-cyan-200/90 sm:px-2.5 sm:text-xs";

    const pillInteractiveClass = linkable
        ? " transition hover:border-cyan-400/45 hover:bg-cyan-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400/60"
        : "";

    const goToTagFilter = (value, event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!value) return;
        router.get(route("tienda"), { tag: value }, { preserveScroll: false });
    };

    return (
        <ul className={`flex flex-wrap gap-1 ${className}`.trim()} aria-label={ariaLabel}>
            {items.map((item) => (
                <li key={`${item.value}-${item.label}`}>
                    {linkable && item.value ? (
                        <button
                            type="button"
                            className={`${pillClass}${pillInteractiveClass}`.trim()}
                            onClick={(event) => goToTagFilter(item.value, event)}
                        >
                            {item.label}
                        </button>
                    ) : (
                        <span className={pillClass}>{item.label}</span>
                    )}
                </li>
            ))}
        </ul>
    );
}
