import React from "react";

const VARIANT_CLASSES = {
    success: "bg-emerald-900/35 text-emerald-100 ring-emerald-600/30",
    neutral: "bg-slate-800 text-slate-300 ring-slate-600/40",
    warning: "bg-amber-900/35 text-amber-100 ring-amber-600/30",
    danger: "bg-rose-900/35 text-rose-100 ring-rose-600/30",
};

/**
 * Badge de estado con semántica de color consistente en todo el admin.
 * variant: success (activo/confirmado) | neutral (inactivo/desactivado) | warning (aviso/caducado) | danger (rechazado)
 */
export default function AdminStatusBadge({ variant = "neutral", className = "", children }) {
    const variantClass = VARIANT_CLASSES[variant] || VARIANT_CLASSES.neutral;

    return (
        <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${variantClass} ${className}`}
        >
            {children}
        </span>
    );
}
