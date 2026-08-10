import React from "react";

/**
 * Card oscura estándar para paneles admin. `muted` atenúa la card (ej. registro inactivo).
 */
export default function AdminCard({ muted = false, className = "", children, ...rest }) {
    return (
        <article
            className={`rounded-2xl border p-4 transition sm:p-5 ${
                muted
                    ? "border-white/5 bg-slate-900/40 opacity-70"
                    : "border-white/10 bg-slate-900/70"
            } ${className}`}
            {...rest}
        >
            {children}
        </article>
    );
}
