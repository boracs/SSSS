import React from "react";

export const adminInputClass =
    "w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20";

/**
 * Wrapper label + control con el estilo estándar de formularios admin.
 * Para checkbox, pasa `type="checkbox"` y usa `checked`/`onChange` en `inputProps`; el label se pinta a la derecha.
 * Para select/textarea, pasa `as="select"` o `as="textarea"` y `children`/`inputProps` según corresponda.
 */
export default function AdminFormField({
    label,
    as = "input",
    type = "text",
    className = "",
    inputProps = {},
    children,
}) {
    if (type === "checkbox") {
        return (
            <label className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-slate-200">
                <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-500 bg-slate-900 text-cyan-500 accent-cyan-500 focus:ring-2 focus:ring-cyan-500/40"
                    {...inputProps}
                />
                <span className="text-sm font-semibold">{label}</span>
            </label>
        );
    }

    const Control = as === "select" ? "select" : as === "textarea" ? "textarea" : "input";
    const controlProps = as === "input" ? { type, ...inputProps } : inputProps;

    if (!label) {
        return (
            <Control className={`${adminInputClass} ${className}`} {...controlProps}>
                {children}
            </Control>
        );
    }

    return (
        <label className="block text-sm text-slate-300">
            {label}
            <Control className={`mt-1 ${adminInputClass} ${className}`} {...controlProps}>
                {children}
            </Control>
        </label>
    );
}
