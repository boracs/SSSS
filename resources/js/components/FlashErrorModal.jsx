import React, { useEffect, useId, useState } from "react";
import { usePage } from "@inertiajs/react";
import { AlertTriangle, X } from "lucide-react";

/**
 * Modal de alerta bloqueante para flash.access_alert (p. ej. cuota vencida / sin taquilla).
 * Solo se cierra con el botón «Entendido» o la X — no al pulsar el fondo.
 */
export default function FlashErrorModal() {
    const { flash } = usePage().props;
    const titleId = useId();
    const descId = useId();
    const [message, setMessage] = useState(null);

    useEffect(() => {
        const next = typeof flash?.access_alert === "string" ? flash.access_alert.trim() : "";
        if (next) {
            setMessage(next);
        }
    }, [flash?.access_alert]);

    if (!message) return null;

    const close = () => setMessage(null);

    return (
        <div
            className="fixed inset-0 z-modal flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
            role="presentation"
        >
            <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={descId}
                className="relative w-full max-w-md overflow-hidden rounded-2xl border border-rose-500/50 bg-slate-950 shadow-2xl shadow-rose-950/40 ring-1 ring-rose-500/30"
            >
                <div className="border-b border-rose-500/25 bg-rose-500/10 px-5 py-4">
                    <div className="flex items-start gap-3">
                        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-500/20 text-rose-300 ring-1 ring-rose-400/40">
                            <AlertTriangle className="h-5 w-5" aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1 pt-0.5">
                            <h2 id={titleId} className="text-base font-bold text-rose-100">
                                Acceso restringido
                            </h2>
                            <p className="mt-0.5 text-xs font-medium text-rose-200/80">
                                No puedes usar el carrito ahora mismo
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={close}
                            aria-label="Cerrar aviso"
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-rose-200/80 transition hover:bg-rose-500/20 hover:text-white"
                        >
                            <X className="h-4 w-4" aria-hidden />
                        </button>
                    </div>
                </div>

                <div className="px-5 py-4">
                    <p id={descId} className="text-sm leading-relaxed text-slate-200">
                        {message}
                    </p>
                </div>

                <div className="border-t border-white/10 px-5 py-4">
                    <button
                        type="button"
                        onClick={close}
                        autoFocus
                        className="w-full rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-rose-950/40 transition hover:bg-rose-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                    >
                        Entendido
                    </button>
                </div>
            </div>
        </div>
    );
}
