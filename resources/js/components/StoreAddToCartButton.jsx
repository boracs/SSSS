import React from "react";
import { ShoppingBag } from "lucide-react";

/**
 * Estilo único CTA «añadir al carrito» (tienda + slider ofertas).
 * Gradiente S4 oscuro — evita el cyan claro sobre fondos dark.
 *
 * @param {{ compact?: boolean, disabled?: boolean, surface?: "light"|"dark" }} opts
 * @returns {string}
 */
export function storeAddToCartClassName({
    compact = false,
    disabled = false,
    surface = "light",
} = {}) {
    const size = compact
        ? "gap-1.5 rounded-lg py-1.5 text-xs"
        : "gap-2 rounded-xl py-2.5 text-xs sm:text-sm";

    if (disabled) {
        if (surface === "dark") {
            return `inline-flex w-full cursor-not-allowed items-center justify-center font-bold tracking-wide bg-slate-700/50 text-slate-500 ${size}`;
        }
        return `inline-flex w-full cursor-not-allowed items-center justify-center border border-dashed border-slate-200 bg-slate-50 font-semibold text-slate-400 ${size}`;
    }

    return `inline-flex w-full items-center justify-center bg-gradient-to-r from-[#0f5f74] via-cyan-700 to-cyan-600 font-bold text-white shadow-md shadow-cyan-900/25 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-cyan-900/30 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60 ${size}`;
}

/**
 * @param {{ compact?: boolean, loading?: boolean, shortLabel?: boolean }} props
 */
export function StoreAddToCartLabel({ compact = false, loading = false, shortLabel = false }) {
    if (loading) return "…";
    return (
        <>
            <ShoppingBag
                className={`transition-transform group-hover:scale-110 ${compact ? "h-3.5 w-3.5" : "h-3.5 w-3.5 sm:h-4 sm:w-4"}`}
                aria-hidden
            />
            {shortLabel || compact ? "Añadir" : "Añadir al carrito"}
        </>
    );
}

/**
 * Botón de compra tienda/ofertas (mismo look en grid oscuro y slider claro).
 *
 * @param {{
 *   compact?: boolean,
 *   disabled?: boolean,
 *   loading?: boolean,
 *   surface?: "light"|"dark",
 *   shortLabel?: boolean,
 *   onClick?: (e: React.MouseEvent) => void,
 *   children?: React.ReactNode,
 *   className?: string,
 * }} props
 */
export default function StoreAddToCartButton({
    compact = false,
    disabled = false,
    loading = false,
    surface = "light",
    shortLabel = false,
    onClick,
    children,
    className = "",
}) {
    const inactive = disabled || loading;
    return (
        <button
            type="button"
            disabled={inactive}
            onClick={onClick}
            className={`${storeAddToCartClassName({ compact, disabled: inactive, surface })} ${className}`.trim()}
        >
            {children ?? (
                <StoreAddToCartLabel
                    compact={compact}
                    loading={loading}
                    shortLabel={shortLabel}
                />
            )}
        </button>
    );
}
