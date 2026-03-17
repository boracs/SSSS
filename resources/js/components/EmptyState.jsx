import React from "react";

const NauticalIcon = ({ className = "" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
    </svg>
);

/**
 * Estado vacío elegante para listas/búsquedas sin resultados.
 */
export default function EmptyState({
    title = "Sin resultados",
    description = "No hay elementos que coincidan con los filtros o la búsqueda.",
    icon: Icon = NauticalIcon,
    action = null,
    className = "",
}) {
    return (
        <div
            className={`flex flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white px-8 py-12 text-center shadow-sm ${className}`}
        >
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <Icon className="h-7 w-7" />
            </div>
            <h3 className="font-heading text-lg font-semibold tracking-tight text-slate-800">
                {title}
            </h3>
            <p className="mt-2 max-w-sm text-sm text-slate-500">
                {description}
            </p>
            {action && <div className="mt-6">{action}</div>}
        </div>
    );
}
