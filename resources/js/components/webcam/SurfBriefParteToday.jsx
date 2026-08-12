import React from "react";
import { Link } from "@inertiajs/react";
import { Clock, Sparkles, Video, Waves } from "lucide-react";
import SurfBriefReactions from "./SurfBriefReactions";
import SurfLevelAccordion from "./SurfLevelAccordion";
import SurfBriefLevelBlocks from "./SurfBriefLevelBlocks";
import SurfBriefParteCta from "./SurfBriefParteCta";
import { surfBriefOverrideMeta } from "./surfBriefOverride";

function UnifiedAlert({ note, aviso }) {
    const text = [note, aviso].filter(Boolean).join(" ");
    if (!text) return null;
    const isDanger = Boolean(aviso);
    return (
        <p
            className={`mb-3 rounded-xl px-3 py-2 text-sm font-medium ring-1 ${
                isDanger
                    ? "bg-amber-50 text-amber-900 ring-amber-200/80"
                    : "bg-slate-900/[0.04] text-slate-800 ring-slate-900/5"
            }`}
            role={isDanger ? "alert" : undefined}
        >
            {text}
        </p>
    );
}

/**
 * Bloque público «Parte S4 · Hoy» (forecast + guía de niveles + feedback).
 */
export default function SurfBriefParteToday({
    summary,
    summarySections = null,
    summaryStatus = null,
    summaryMessage = null,
    updatedAtHuman,
    signal = null,
    reactions = null,
}) {
    const signalMeta = signal?.status ? surfBriefOverrideMeta(signal.status) : null;
    const hasStructured =
        Boolean(summarySections?.iniciacion) ||
        Boolean(summarySections?.intermedio) ||
        Boolean(summarySections?.avanzado);

    if (!summary) {
        return (
            <div
                id="parte-s4-hoy"
                className="mt-4 scroll-mt-24 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-lg sm:mt-5 sm:p-5 md:p-6"
            >
                <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#0f5f74]">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden />
                    Parte S4 · Hoy
                </div>
                <p className="mt-2 text-[11px] text-slate-500">
                    Parte del monitor S4 — no es un algoritmo genérico.
                </p>
                <p className="mt-3 text-sm font-medium text-slate-800">
                    {summaryStatus === "generating"
                        ? summaryMessage || "Generando el parte de hoy…"
                        : "El parte de hoy aún no está disponible."}
                </p>
                <p className="mt-2 text-[11px] text-slate-500">
                    {summaryStatus === "generating"
                        ? "Recarga la página en unos segundos."
                        : "Mientras tanto puedes consultar la webcam o las clases."}
                </p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <Link
                        href={`${route("servicios.webcams")}#webcam-directo`}
                        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#0f5f74] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0d4a5c]"
                    >
                        <Video className="h-4 w-4 shrink-0" aria-hidden />
                        Ver webcam en directo
                    </Link>
                    <Link
                        href={route("servicios.surf")}
                        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#0f5f74] transition hover:bg-slate-50"
                    >
                        <Waves className="h-4 w-4 shrink-0" aria-hidden />
                        Clases de surf
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <article
            id="parte-s4-hoy"
            className={`mt-4 scroll-mt-24 rounded-2xl border p-4 shadow-lg sm:mt-5 sm:p-5 md:p-6 ${
                signalMeta ? signalMeta.tableWrap : "border-slate-200/90 bg-white"
            }`}
            aria-labelledby="parte-s4-hoy-heading"
        >
            <header className="mb-4 flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
                <div className="min-w-0 space-y-1.5">
                    <div
                        id="parte-s4-hoy-heading"
                        className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#0f5f74]"
                    >
                        <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        Parte S4 · Hoy
                    </div>
                    <p className="text-[11px] text-slate-500">
                        Parte del monitor S4 — no es un algoritmo genérico.
                    </p>
                    {updatedAtHuman ? (
                        <p className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                            <Clock className="h-3 w-3 shrink-0" aria-hidden />
                            Actualizado {updatedAtHuman}
                        </p>
                    ) : null}
                </div>
                {signalMeta ? (
                    <span
                        className={`inline-flex max-w-[min(100%,20rem)] shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold leading-snug ${signalMeta.tableBadge}`}
                    >
                        {signalMeta.badge}
                        {signal?.is_manual ? (
                            <span className="ml-1.5 opacity-80">· S4</span>
                        ) : null}
                    </span>
                ) : null}
            </header>

            <UnifiedAlert note={signal?.note} aviso={summarySections?.aviso} />

            {(summarySections?.general || summary) ? (
                <div className="rounded-xl bg-slate-50/90 px-3 py-3 ring-1 ring-slate-900/5 sm:px-4">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Resumen del día
                    </p>
                    <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-900 sm:text-[15px]">
                        {summarySections?.general || summary}
                    </p>
                </div>
            ) : null}

            {hasStructured ? (
                <SurfBriefLevelBlocks
                    summarySections={summarySections}
                    signalStatus={signal?.status}
                />
            ) : null}

            <SurfBriefParteCta signalStatus={signal?.status} className="mt-3 w-full sm:w-auto" />

            <SurfLevelAccordion />
            <SurfBriefReactions initial={reactions} />
        </article>
    );
}
