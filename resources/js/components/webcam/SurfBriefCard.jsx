import React, { useState } from "react";
import { router, usePage } from "@inertiajs/react";
import { SURF_BRIEF_OVERRIDE_ORDER, SURF_BRIEF_OVERRIDES } from "./surfBriefOverride";

/**
 * Controles solo-admin del parte:
 * - Los 4 niveles se calculan solos (signal.auto_status).
 * - Pulsar un color los fija como aviso de la escuela (override).
 * - Nota opcional + «Quitar aviso» vuelve al cálculo automático.
 */
export default function SurfBriefCard({ brief }) {
    const isAdmin = usePage().props?.auth?.user?.role === "admin";
    const [note, setNote] = useState(brief?.signal?.note || brief?.override?.note || "");
    const [processing, setProcessing] = useState(false);

    if (!isAdmin || !brief?.has_data) {
        return null;
    }

    const signal = brief.signal || {};
    const activeStatus = signal.status || signal.auto_status || null;
    const isManual = !!signal.is_manual;

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
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-amber-200/80">Solo admin · Parte S4</p>
            <p className="mb-3 text-[11px] leading-relaxed text-amber-100/70">
                {isManual
                    ? "Aviso fijado por la escuela (manda sobre el cálculo automático)."
                    : "Nivel automático según oleaje/viento. Pulsa un color para fijarlo a mano."}
            </p>
            <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Nota opcional para el aviso (ej. temporal previsto por la tarde)"
                rows={2}
                className="mb-3 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-slate-100 outline-none focus:border-cyan-500"
            />
            <div className="flex flex-wrap gap-2">
                {SURF_BRIEF_OVERRIDE_ORDER.map((key) => {
                    const meta = SURF_BRIEF_OVERRIDES[key];
                    const isEffective = activeStatus === meta.status;
                    const isAutoOnly = !isManual && signal.auto_status === meta.status;
                    return (
                        <button
                            key={meta.status}
                            type="button"
                            disabled={processing}
                            onClick={() => submitOverride(meta.status)}
                            title={`${meta.buttonTitle}: ${meta.buttonSub}`}
                            aria-pressed={isManual && isEffective}
                            className={`max-w-[12.5rem] rounded-lg px-3 py-2 text-left text-xs font-semibold leading-snug disabled:opacity-50 ${meta.adminClass} ${
                                isManual && isEffective
                                    ? "ring-2 ring-white/80 ring-offset-2 ring-offset-amber-950"
                                    : isAutoOnly
                                      ? "ring-2 ring-cyan-300/70 ring-offset-2 ring-offset-amber-950"
                                      : ""
                            }`}
                        >
                            <span className="block">{meta.buttonTitle}</span>
                            <span className="mt-0.5 block text-[10px] font-medium opacity-90">{meta.buttonSub}</span>
                            {isAutoOnly ? (
                                <span className="mt-1 block text-[9px] font-bold uppercase tracking-wide opacity-80">
                                    Auto
                                </span>
                            ) : null}
                            {isManual && isEffective ? (
                                <span className="mt-1 block text-[9px] font-bold uppercase tracking-wide opacity-80">
                                    Fijado
                                </span>
                            ) : null}
                        </button>
                    );
                })}
                {isManual ? (
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
