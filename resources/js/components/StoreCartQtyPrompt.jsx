import React from "react";
import { Minus, Plus } from "lucide-react";

/**
 * Mini panel: segundo clic rápido al carrito pide cuántas unidades más añadir.
 */
export default function StoreCartQtyPrompt({
    open,
    compact = false,
    surface = "dark",
    value,
    max,
    onChange,
    onConfirm,
    onCancel,
}) {
    if (!open) return null;

    const isLight = surface === "light";
    const canMinus = value > 1;
    const canPlus = value < max;

    return (
        <div
            role="dialog"
            aria-label="Cantidad a añadir"
            onClick={(e) => e.stopPropagation()}
            className={[
                "mb-2 rounded-xl border p-2.5 shadow-lg",
                compact ? "text-[11px]" : "text-xs",
                isLight
                    ? "border-slate-200 bg-white text-slate-800"
                    : "border-white/15 bg-slate-900 text-slate-100",
            ].join(" ")}
        >
            <p className={`font-semibold leading-snug ${isLight ? "text-slate-900" : "text-white"}`}>
                Ya está en el carrito. ¿Cuántas unidades más quieres?
            </p>
            <div className="mt-2 flex items-center gap-2">
                <div
                    className={[
                        "inline-flex items-center rounded-lg ring-1",
                        isLight ? "bg-slate-50 ring-slate-200" : "bg-slate-800 ring-white/10",
                    ].join(" ")}
                >
                    <button
                        type="button"
                        disabled={!canMinus}
                        onClick={() => onChange(value - 1)}
                        className="flex h-8 w-8 items-center justify-center disabled:opacity-30"
                        aria-label="Quitar una"
                    >
                        <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="min-w-[1.75rem] text-center text-sm font-bold tabular-nums">{value}</span>
                    <button
                        type="button"
                        disabled={!canPlus}
                        onClick={() => onChange(value + 1)}
                        className="flex h-8 w-8 items-center justify-center disabled:opacity-30"
                        aria-label="Añadir una"
                    >
                        <Plus className="h-3.5 w-3.5" />
                    </button>
                </div>
                <button
                    type="button"
                    onClick={onConfirm}
                    className="min-h-8 flex-1 rounded-lg bg-cyan-600 px-2.5 text-xs font-bold text-white hover:bg-cyan-500"
                >
                    Añadir {value}
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className={`min-h-8 px-1.5 text-[11px] font-semibold ${isLight ? "text-slate-500" : "text-slate-400"}`}
                >
                    No
                </button>
            </div>
        </div>
    );
}
