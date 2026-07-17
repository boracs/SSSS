import React, { useState } from "react";
import { router, usePage } from "@inertiajs/react";

/**
 * Controles solo-admin del parte (override + regenerar). El texto y el badge
 * de nivel viven en SurfForecastTable para no duplicar UI vacía al público.
 */
export default function SurfBriefCard({ brief }) {
    const isAdmin = usePage().props?.auth?.user?.role === "admin";
    const [note, setNote] = useState(brief?.override?.note || "");
    const [processing, setProcessing] = useState(false);

    if (!isAdmin || !brief?.has_data) {
        return null;
    }

    const submitOverride = (status) => {
        if (processing) return;
        setProcessing(true);
        router.patch(
            route("admin.surf-brief.override"),
            { status, note: status ? note.trim() || null : null },
            { preserveScroll: true, onFinish: () => setProcessing(false) }
        );
    };

    const regenerate = () => {
        if (processing) return;
        setProcessing(true);
        router.post(route("admin.surf-brief.regenerate"), {}, { preserveScroll: true, onFinish: () => setProcessing(false) });
    };

    return (
        <div className="rounded-2xl border border-dashed border-amber-400/30 bg-amber-950/20 p-4">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-amber-200/80">Solo admin · Parte S4</p>
            <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Nota opcional para el aviso (ej. temporal previsto por la tarde)"
                rows={2}
                className="mb-3 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-slate-100 outline-none focus:border-cyan-500"
            />
            <div className="flex flex-wrap gap-2">
                <button type="button" disabled={processing} onClick={() => submitOverride("good")} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
                    Marcar bien
                </button>
                <button type="button" disabled={processing} onClick={() => submitOverride("caution")} className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
                    Precaución
                </button>
                <button type="button" disabled={processing} onClick={() => submitOverride("closed")} className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
                    Cerrado
                </button>
                {brief.override ? (
                    <button type="button" disabled={processing} onClick={() => submitOverride(null)} className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
                        Quitar aviso
                    </button>
                ) : null}
                <button type="button" disabled={processing} onClick={regenerate} className="ml-auto rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10 disabled:opacity-50">
                    Regenerar ahora
                </button>
            </div>
        </div>
    );
}
