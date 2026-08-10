import React from "react";

const VARIANT_CLASSES = {
    primary: "bg-cyan-600 hover:bg-cyan-500 text-white",
    success: "bg-emerald-600 hover:bg-emerald-500 text-white",
    danger: "bg-rose-600 hover:bg-rose-500 text-white",
    ghost: "bg-slate-700 hover:bg-slate-600 text-white",
};

/**
 * Botón admin con semántica de color consistente.
 * variant: primary (acción principal) | success (activar/confirmar) | danger (desactivar/rechazar) | ghost (secundario/cancelar)
 */
export default function AdminButton({
    variant = "primary",
    type = "button",
    disabled = false,
    className = "",
    children,
    ...rest
}) {
    const variantClass = VARIANT_CLASSES[variant] || VARIANT_CLASSES.primary;

    return (
        <button
            type={type}
            disabled={disabled}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${variantClass} ${className}`}
            {...rest}
        >
            {children}
        </button>
    );
}
